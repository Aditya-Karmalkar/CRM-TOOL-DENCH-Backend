import { Router } from 'express';
import { env } from '../config.js';
import { processPubSubNotification } from '../services/sync-pipeline.js';

export const pubsubRouter = Router();

interface PubSubMessage {
  message?: {
    data?: string;
    messageId?: string;
  };
  subscription?: string;
}

pubsubRouter.post('/gmail', async (req, res) => {
  const token = req.query.token as string | undefined;
  if (token !== env.googlePubsubVerificationToken) {
    res.status(403).json({ error: 'Invalid verification token' });
    return;
  }

  const body = req.body as PubSubMessage;
  if (!body.message?.data) {
    res.status(204).send();
    return;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(body.message.data, 'base64').toString('utf8'),
    ) as { emailAddress?: string; historyId?: string };

    if (decoded.emailAddress && decoded.historyId) {
      void processPubSubNotification({
        emailAddress: decoded.emailAddress,
        historyId: String(decoded.historyId),
      });
    }
  } catch (err) {
    console.error('Pub/Sub processing error:', err);
  }

  res.status(204).send();
});
