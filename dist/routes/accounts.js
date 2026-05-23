import { Router } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { disconnectGmail, disconnectHubspot, getAccountByUserId, updateEmailFilters, } from "../services/firestore.js";
import { getGmailAuthUrl } from "../services/gmail.js";
import { getHubspotAuthUrl } from "../services/hubspot.js";
import { connectGmailAccount } from "../services/sync-pipeline.js";
import { stopGmailWatch, refreshGmailTokensIfNeeded, } from "../services/gmail.js";
import { getGmailTokens } from "../services/firestore.js";
import { env } from "../config.js";
export const accountsRouter = Router();
accountsRouter.use(requireAuth);
accountsRouter.get("/me", async (req, res) => {
    try {
        const account = await getAccountByUserId(req.user.uid);
        res.json({ account });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load account";
        res.status(500).json({ error: message });
    }
});
accountsRouter.get("/gmail/auth-url", (req, res) => {
    const state = `${req.user.uid}:${randomBytes(16).toString("hex")}`;
    res.json({ url: getGmailAuthUrl(state) });
});
accountsRouter.get("/hubspot/auth-url", (req, res) => {
    const url = getHubspotAuthUrl(req.user.uid);
    res.json({ url });
});
accountsRouter.post("/gmail/connect", async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: "Missing authorization code" });
            return;
        }
        const result = await connectGmailAccount(req.user.uid, req.user.email ?? "", code);
        res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Gmail connect failed";
        res.status(400).json({ error: message });
    }
});
accountsRouter.delete("/gmail", async (req, res) => {
    const account = await getAccountByUserId(req.user.uid);
    if (!account) {
        res.status(404).json({ error: "No account found" });
        return;
    }
    try {
        let tokens = getGmailTokens(account.doc);
        tokens = await refreshGmailTokensIfNeeded(tokens);
        if (env.googlePubsubTopic) {
            await stopGmailWatch(tokens);
        }
    }
    catch {
        // Best-effort stop watch
    }
    await disconnectGmail(account.id);
    res.json({ ok: true });
});
accountsRouter.patch("/filters", async (req, res) => {
    const account = await getAccountByUserId(req.user.uid);
    if (!account) {
        res.status(404).json({ error: "No account found" });
        return;
    }
    const { includeDomains, excludeDomains } = req.body;
    await updateEmailFilters(account.id, {
        includeDomains: includeDomains ?? account.emailFilters.includeDomains,
        excludeDomains: excludeDomains ?? account.emailFilters.excludeDomains,
    });
    res.json({ ok: true });
});
accountsRouter.delete("/hubspot", async (req, res) => {
    const account = await getAccountByUserId(req.user.uid);
    if (!account) {
        res.status(404).json({ error: "No account found" });
        return;
    }
    await disconnectHubspot(account.id);
    res.json({ ok: true });
});
