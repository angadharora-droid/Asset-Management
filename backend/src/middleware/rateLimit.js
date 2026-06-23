// Minimal in-memory, per-IP rate limiter (no external dependency). Suitable for
// a single-instance internal tool; for multi-instance deployments use a shared
// store (Redis) instead.
function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    // Key on the framework-resolved client IP only. Never trust a raw client
    // header (e.g. X-Forwarded-For) — configure `trust proxy` so req.ip is
    // derived from the trusted proxy chain.
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const rec = hits.get(key);

    if (!rec || now > rec.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
    } else {
      rec.count += 1;
      if (rec.count > max) {
        const retry = Math.ceil((rec.reset - now) / 1000);
        res.set('Retry-After', String(retry));
        return res.status(429).json({ message });
      }
    }

    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }
    next();
  };
}

// Brute-force protection for login.
export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
});

// Throttle the unauthenticated public scan endpoint.
export const publicRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many requests. Please slow down.',
});
