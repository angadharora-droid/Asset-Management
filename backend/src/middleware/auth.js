import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

// Require a valid JWT. Loads the user and attaches it to req.user.
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }

  try {
    const user = await User.findById(payload.id);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Account not found or disabled.' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access is required for this action.' });
  }
  next();
}
