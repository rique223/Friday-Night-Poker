import { Router } from 'express';

import * as controller from '../controllers/sessionController.js';
import { wrapAsync } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', wrapAsync(controller.listSessions));
router.get('/archived', wrapAsync(controller.listArchived));
router.post('/', wrapAsync(controller.createSession));
router.get('/:sessionId', wrapAsync(controller.getSession));
router.post('/:sessionId/end', wrapAsync(controller.endSession));
router.post('/:sessionId/archive', wrapAsync(controller.archiveSession));
router.post('/:sessionId/players', wrapAsync(controller.addPlayer));
router.get('/:sessionId/players', wrapAsync(controller.listPlayers));
router.post('/:sessionId/buy-in', wrapAsync(controller.registerBuyIn));
router.post('/:sessionId/credit', wrapAsync(controller.registerCredit));
router.post('/:sessionId/cash-out', wrapAsync(controller.cashOut));

export default router;
