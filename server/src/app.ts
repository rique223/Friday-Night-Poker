import fs from 'node:fs';
import path from 'node:path';

import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { buildOpenApiDocument } from '@fnp/shared';

import { getDb, resetGameData } from './db/index.js';
import { requireAuth } from './middleware/auth.js';
import { cacheControl } from './middleware/cacheControl.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { originGuard } from './middleware/originGuard.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import { config } from './config.js';

const app = express();
const startedAt = Date.now();

// Only trust forwarded headers when a proxy is actually configured — otherwise a client
// can spoof `X-Forwarded-For` and get a fresh rate-limit bucket per request (Q23).
app.set('trust proxy', config.trustProxy);
app.disable('etag');
app.disable('x-powered-by');

app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const api = express.Router();
// A 32 kb cap: the largest legitimate body here is a login (Q24).
api.use(express.json({ limit: '32kb' }));
api.use(cookieParser());
api.use(cacheControl);
api.use(originGuard);

api.get('/health', async (_req, res) => {
    let database: 'up' | 'down' = 'down';
    try {
        const db = await getDb();
        await db.get('SELECT 1');
        database = 'up';
    } catch {
        database = 'down';
    }
    // Q51: this used to return `{ ok: true }` unconditionally, even with the database
    // unreachable, which made it useless as a health check.
    res.status(database === 'up' ? 200 : 503).json({
        success: database === 'up',
        data: { ok: database === 'up', database, uptimeSeconds: (Date.now() - startedAt) / 1000 },
    });
});

api.get('/openapi.json', (_req, res) => {
    res.json(buildOpenApiDocument());
});

api.use('/auth', authRoutes);
api.use('/sessions', requireAuth, sessionRoutes);

if (config.enableDevRoutes) {
    // Q12: this endpoint used to be mounted with no auth and no environment guard. With
    // `cors({ origin: true })` reflecting every origin, any site the owner visited while
    // the server was running could wipe every session and player. It now requires a
    // session, is unreachable when NODE_ENV=production, and is off unless ENABLE_DEV_ROUTES
    // is explicitly set.
    console.warn('DEV ROUTES ENABLED: DELETE /api/dev/reset will destroy all game data');
    api.delete('/dev/reset', requireAuth, async (_req, res) => {
        await resetGameData();
        res.status(204).end();
    });
}

api.use(notFoundHandler);
app.use('/api', api);

// Q103: one process, one origin, so the session cookie needs no cross-origin handling
// and no separate static file server has to be deployed.
if (config.isProduction && fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist, { index: false }));
    app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(config.clientDist, 'index.html'));
    });
}

app.use(errorHandler);

export default app;
