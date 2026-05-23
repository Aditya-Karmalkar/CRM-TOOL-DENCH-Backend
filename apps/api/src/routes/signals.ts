import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { listSignalsForUser, getSlackConfig, saveSlackConfig } from "../services/signals.js";

export const signalsRouter = Router();
signalsRouter.use(requireAuth);

// GET /signals — list all signals for the authenticated user
signalsRouter.get("/", async (req: AuthenticatedRequest, res) => {
    try {
        const signals = await listSignalsForUser(req.user!.uid);
        res.json({ signals });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load signals";
        res.status(500).json({ error: message });
    }
});

// GET /signals/slack — get Slack config
signalsRouter.get("/slack", async (req: AuthenticatedRequest, res) => {
    try {
        const config = await getSlackConfig(req.user!.uid);
        res.json({ config: config ?? { enabled: false, webhookUrl: "" } });
    } catch (err) {
        res.status(500).json({ error: "Failed to load Slack config" });
    }
});

// POST /signals/slack — save Slack config
signalsRouter.post("/slack", async (req: AuthenticatedRequest, res) => {
    const { enabled, webhookUrl } = req.body as { enabled?: boolean; webhookUrl?: string };

    if (webhookUrl && !webhookUrl.startsWith("https://hooks.slack.com/")) {
        res.status(400).json({ error: "Webhook URL must start with https://hooks.slack.com/" });
        return;
    }

    try {
        await saveSlackConfig(req.user!.uid, !!enabled, webhookUrl ?? "");
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to save Slack config" });
    }
});
