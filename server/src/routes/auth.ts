import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { LoginBody } from '@fnp/shared';

import * as controller from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    // Q22: an IPv6 client gets a fresh /128 per request, so keying on the raw
    // `req.ip` let a limiter be bypassed trivially. `ipKeyGenerator` normalises to
    // the /64 subnet, which is what express-rate-limit v8 validates for.
    keyGenerator: req => {
        const email = String((req.body as { email?: unknown })?.email ?? '')
            .trim()
            .toLowerCase();
        return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
    },
    message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
    },
});

const router = Router();

router.post('/login', loginLimiter, validate({ body: LoginBody }), controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

export default router;
