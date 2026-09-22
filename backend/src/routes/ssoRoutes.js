import { Router } from 'express';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { directoryGuard } from '../lib/ssoClient.js';

const router = Router();

// GET /api/sso/users — user directory for the central sign-on admin screen.
// Only reachable with the shared secret; never exposes password hashes. The
// `id` is the Mongo _id, which is what POST /api/auth/sso looks accounts up by.
router.get(
  '/users',
  directoryGuard,
  asyncHandler(async (_req, res) => {
    const users = await User.find({ active: true }, { name: 1, email: 1, role: 1 }).sort({ createdAt: 1 }).lean();
    res.json(users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role })));
  })
);

export default router;
