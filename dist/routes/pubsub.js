import { Router } from 'express';
import { env } from '../config.js';
import { processPubSubNotification } from '../services/sync-pipeline.js';
export const pubsubRouter = Router();
pubsubRouter.post('/gmail', async (req, res) => {
    const token = req.query.token;
    if (token !== env.googlePubsubVerificationToken) {
        res.status(403).json({ error: 'Invalid verification token' });
        return;
    }
    const body = req.body;
    if (!body.message?.data) {
        res.status(204).send();
        return;
    }
    try {
        const decoded = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf8'));
        if (decoded.emailAddress && decoded.historyId) {
            void processPubSubNotification({
                emailAddress: decoded.emailAddress,
                historyId: String(decoded.historyId),
            });
        }
    }
    catch (err) {
        console.error('Pub/Sub processing error:', err);
    }
    res.status(204).send();
});
