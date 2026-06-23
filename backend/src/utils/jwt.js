import crypto from 'crypto';
import jwt from 'jsonwebtoken';

let cachedSecret = null;

// Resolve the signing secret lazily (so dotenv has loaded) and cache it.
// No hardcoded fallback: production MUST set a strong JWT_SECRET; in dev we
// generate a random per-process secret so there is never a known constant
// (tokens simply don't survive a dev restart).
function secret() {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set to a strong random value (at least 32 characters) in production.'
    );
  }

  cachedSecret = crypto.randomBytes(48).toString('hex');
  console.warn(
    '⚠ JWT_SECRET is missing or too short — using a random ephemeral secret for this dev session ' +
      '(logins reset whenever the server restarts). Set JWT_SECRET in backend/.env to persist sessions.'
  );
  return cachedSecret;
}

export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, secret(), {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}
