import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '../services/firebase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string | null;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
