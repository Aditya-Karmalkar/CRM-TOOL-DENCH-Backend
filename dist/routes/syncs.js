import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listSyncsForUser, getMetricsForUser } from "../services/firestore.js";
import { getFromCache, setCache } from "../services/cache.js";
import { retrySync, manualSync } from "../services/sync-pipeline.js";
export const syncsRouter = Router();
syncsRouter.use(requireAuth);
syncsRouter.get("/", async (req, res) => {
    try {
        const failedOnly = req.query.failed === "true";
        const syncs = await listSyncsForUser(req.user.uid, failedOnly);
        res.json({ syncs });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load syncs";
        res.status(500).json({ error: message, syncs: [] });
    }
});
syncsRouter.get("/metrics", requireAuth, async (req, res) => {
    try {
        const days = Number(req.query.days) || 30;
        const allowed = [7, 30, 90];
        const daysVal = allowed.includes(days) ? days : 30;
        const cacheKey = `metrics:${req.user.uid}:${daysVal}`;
        const cached = getFromCache(cacheKey);
        if (cached !== null) {
            res.json({ metrics: cached });
            return;
        }
        const metrics = await getMetricsForUser(req.user.uid, daysVal);
        setCache(cacheKey, metrics, 30); // short TTL
        res.json({ metrics });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load metrics";
        res.status(500).json({
            error: message,
            metrics: {
                totalProcessed: 0,
                syncedCount: 0,
                failedCount: 0,
                uniqueContacts: 0,
                topCompanies: [],
                topContacts: [],
                extractionCoverage: 0,
                emailTypeCounts: {},
                sentimentCounts: {},
            },
        });
    }
});
syncsRouter.post("/:id/retry", async (req, res) => {
    try {
        await retrySync(String(req.params.id), req.user.uid);
        res.json({ ok: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Retry failed";
        res.status(400).json({ error: message });
    }
});
syncsRouter.post("/manual", async (req, res) => {
    try {
        const maxMessages = Math.min(Number(req.body.maxMessages) || 50, 200);
        const result = await manualSync(req.user.uid, maxMessages);
        res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Manual sync failed";
        res.status(500).json({ error: message });
    }
});
