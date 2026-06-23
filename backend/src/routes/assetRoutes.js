import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  listAssets,
  getAsset,
  nextCode,
  createAsset,
  updateAsset,
  updateStatus,
  updateTagDetails,
  deleteAsset,
} from '../controllers/assetController.js';

const router = Router();

router.get('/', asyncHandler(listAssets));
// NOTE: the specific "/meta/next-code" route must be declared before "/:code"
// so it isn't captured by the dynamic code param.
router.get('/meta/next-code', asyncHandler(nextCode));
router.get('/:code', asyncHandler(getAsset));
router.post('/', asyncHandler(createAsset));
router.put('/:code', asyncHandler(updateAsset));
router.patch('/:code/status', asyncHandler(updateStatus));
router.patch('/:code/tag', asyncHandler(updateTagDetails));
router.delete('/:code', requireAdmin, asyncHandler(deleteAsset));

export default router;
