import { Router } from 'express';
import {
    AddPlayerBody,
    BuyInBody,
    CashOutBody,
    CreateSessionBody,
    CreditBody,
    EntryIdParams,
    ListSessionsQuery,
    PlayerIdParams,
    SessionIdParams,
    UpdateAmountBody,
    UpdateSessionBody,
} from '@fnp/shared';

import * as controller from '../controllers/sessionController.js';
import { validate } from '../middleware/validate.js';

/**
 * Resource-shaped routes (Q42/Q43). The previous set used verb-ish paths
 * (`/buy-in`, `/end`, `/archive`), put `archived` in the path where it shadowed
 * `/:sessionId`, and matched neither README's endpoint table.
 *
 * Express 5 forwards rejected promises to the error middleware natively, so the
 * `wrapAsync` wrapper that used to decorate all 13 routes is gone (Q46).
 */
const router = Router();

router.get('/', validate({ query: ListSessionsQuery }), controller.listSessions);
router.post('/', validate({ body: CreateSessionBody }), controller.createSession);

router.get('/:sessionId', validate({ params: SessionIdParams }), controller.getSession);
router.patch(
    '/:sessionId',
    validate({ params: SessionIdParams, body: UpdateSessionBody }),
    controller.updateSession,
);

router.post(
    '/:sessionId/players',
    validate({ params: SessionIdParams, body: AddPlayerBody }),
    controller.addPlayer,
);
router.delete(
    '/:sessionId/players/:playerId',
    validate({ params: PlayerIdParams }),
    controller.removePlayer,
);

router.post(
    '/:sessionId/buy-ins',
    validate({ params: SessionIdParams, body: BuyInBody }),
    controller.registerBuyIn,
);
router.patch(
    '/:sessionId/buy-ins/:entryId',
    validate({ params: EntryIdParams, body: UpdateAmountBody }),
    controller.updateBuyIn,
);
router.delete(
    '/:sessionId/buy-ins/:entryId',
    validate({ params: EntryIdParams }),
    controller.deleteBuyIn,
);

router.post(
    '/:sessionId/credits',
    validate({ params: SessionIdParams, body: CreditBody }),
    controller.registerCredit,
);
router.patch(
    '/:sessionId/credits/:entryId',
    validate({ params: EntryIdParams, body: UpdateAmountBody }),
    controller.updateCredit,
);
router.delete(
    '/:sessionId/credits/:entryId',
    validate({ params: EntryIdParams }),
    controller.deleteCredit,
);

router.post(
    '/:sessionId/cash-outs',
    validate({ params: SessionIdParams, body: CashOutBody }),
    controller.cashOut,
);
router.delete(
    '/:sessionId/cash-outs/:playerId',
    validate({ params: PlayerIdParams }),
    controller.undoCashOut,
);

export default router;
