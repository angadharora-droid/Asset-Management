import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicRateLimit } from '../middleware/rateLimit.js';
import { getPublicAsset } from '../controllers/publicController.js';

// Public, unauthenticated read-only lookup used by scanned barcode tags.
// Looked up by an unguessable scan token, and rate-limited.
const router = Router();

router.get('/asset/:scanId', publicRateLimit, asyncHandler(getPublicAsset));

export default router;
