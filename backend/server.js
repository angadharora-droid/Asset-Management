import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './src/config/db.js';
import assetRoutes from './src/routes/assetRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';
import { protect } from './src/middleware/auth.js';
import { ensureAdminUser } from './src/controllers/authController.js';
import { ensureScanIds } from './src/controllers/assetController.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';

dotenv.config();

const app = express();

// ---- Trust proxy ----
// Set TRUST_PROXY when running behind a reverse proxy / load balancer so req.ip
// (used for rate limiting) reflects the real client. Use a hop count (e.g. "1")
// or a subnet — never a blanket boolean at an untrusted edge. Default: off.
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(tp) ? Number(tp) : tp === 'true' ? true : tp);
}

// ---- CORS ----
const origins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// Fail closed in production: if no allow-list is configured, deny cross-origin
// rather than reflecting any origin. In development, allow all for convenience.
const corsOrigin = origins.length ? origins : process.env.NODE_ENV === 'production' ? false : true;
app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ---- Body parsing (photos are sent as compressed base64, so allow a large body) ----
app.use(express.json({ limit: '25mb' })); // base64 photos + documents (PDF)
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ---- Health check ----
app.get('/api/health', (req, res) =>
  res.json({ ok: true, service: 'cpa-asset-handover', time: new Date().toISOString() })
);

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes); // read-only scan lookups (no auth)
app.use('/api/assets', protect, assetRoutes); // all asset routes require login

// ---- 404 + error handling ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await ensureAdminUser();
    await ensureScanIds();
    app.listen(PORT, () =>
      console.log(`✅ CPA Asset Handover API running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
