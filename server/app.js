import express, { Router } from 'express';
import cors from 'cors';
import sessionRoutes from './routes/sessionRoutes.js';
import devRoutes from './routes/devRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { cacheControl } from './middleware/cacheControl.js';
import * as auth from './controllers/authController.js';
import { wrapAsync } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

const app = express();

app.set('trust proxy', 1);

app.disable('etag');

const globalLimiter = rateLimit({ windowMs: 1*60*1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);
app.use(cors({ origin: true }));
app.use(express.json());
app.use(cacheControl);
app.use(cookieParser());

const loginLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	max: 10, // 10 attempts per window
	standardHeaders: true, // adds RateLimit-* headers + Retry-After
	legacyHeaders: false,
	keyGenerator: (req, _res) => `${req.ip}:${(req.body?.email || '').toLowerCase().trim()}`, // per IP+email
	message: { success: false, error: 'Too many login attempts. Try again later.' },
});

const authRouter = Router();
authRouter.post('/login', loginLimiter, wrapAsync(auth.login));
authRouter.post('/logout', requireAuth, wrapAsync(auth.logout));
authRouter.get('/me', requireAuth, wrapAsync(auth.me));
app.use('/api/auth', authRouter);
app.use('/api/sessions', requireAuth, sessionRoutes);

app.get('/api/health', (_req, res) => {
	res.status(200).json({ success: true, data: { ok: true } });
});

app.use('/api/dev', devRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
