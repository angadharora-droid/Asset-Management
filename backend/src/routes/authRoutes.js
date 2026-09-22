import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import { login, me, listUsers, createUser, updateUser, ssoLogin } from '../controllers/authController.js';

const router = Router();

router.post('/login', loginRateLimit, asyncHandler(login));
// Central sign-on hand-off from the CPG portal (no-op unless AUTH_SERVICE_URL is set).
router.post('/sso', loginRateLimit, asyncHandler(ssoLogin));
router.get('/me', protect, asyncHandler(me));

// User management — admin only.
router.get('/users', protect, requireAdmin, asyncHandler(listUsers));
router.post('/users', protect, requireAdmin, asyncHandler(createUser));
router.patch('/users/:id', protect, requireAdmin, asyncHandler(updateUser));

export default router;
