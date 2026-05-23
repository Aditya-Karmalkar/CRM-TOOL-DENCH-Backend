import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { getHubspotAuthUrl, exchangeHubspotCode } from '../services/hubspot.js';
import { env } from '../config.js';

export const authRouter = Router();

authRouter.get('/hubspot', requireAuth, (req: AuthenticatedRequest, res) => {
  const url = getHubspotAuthUrl(req.user!.uid);
  res.redirect(url);
});

authRouter.get('/hubspot/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) {
    res.status(400).send('Missing code or state');
    return;
  }

  try {
    await exchangeHubspotCode(code, state);
    res.redirect(`${env.webAppUrl}/settings?hubspot=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HubSpot connect failed';
    res.redirect(`${env.webAppUrl}/settings?hubspot=error&message=${encodeURIComponent(message)}`);
  }
});
