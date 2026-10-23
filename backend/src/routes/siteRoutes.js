import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listSites } from '../controllers/siteController.js';

const router = Router();

router.get('/', asyncHandler(listSites));

export default router;
