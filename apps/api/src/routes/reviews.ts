import { Router } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import {
    listPendingExtractionReviews,
    createExtractionReview,
} from "../services/firestore.js";

export const reviewsRouter = Router();

reviewsRouter.use(requireAuth);

reviewsRouter.get("/pending", async (req: AuthenticatedRequest, res) => {
    try {
        const items = await listPendingExtractionReviews(req.user!.uid, 20);
        res.json({ items });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to load reviews";
        res.status(500).json({ error: message });
    }
});

reviewsRouter.post("/:syncId", async (req: AuthenticatedRequest, res) => {
    try {
        const { correctedData, label } = req.body as {
            correctedData?: unknown;
            label: "approved" | "corrected" | "rejected";
        };
        await createExtractionReview(
            String(req.params.syncId),
            req.user!.uid,
            correctedData ?? null,
            label,
        );
        res.json({ ok: true });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to submit review";
        res.status(400).json({ error: message });
    }
});

export default reviewsRouter;
