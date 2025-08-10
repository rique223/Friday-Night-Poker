import { Router } from 'express';

import * as controller from '../controllers/sessionController.js';
import { wrapAsync } from '../middleware/errorHandler.js';

const router = Router();

// Danger: Deletes all data (dev-only)
router.delete('/reset', wrapAsync(controller.resetDb));

export default router;
