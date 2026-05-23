import { getAuth } from '../services/firebase.js';
export async function requireAuth(req, res, next) {
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
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
