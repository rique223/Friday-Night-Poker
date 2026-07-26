import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Env is loaded and validated here, and this module is imported before anything that
 * reads `process.env` (Q14/Q15). Previously `dotenv.config()` ran *after* the hoisted
 * ES module imports, so any module-scope `process.env` read would have silently seen
 * `undefined`, and a missing JWT_SECRET only surfaced as a 500 on the first login.
 */

export const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });

const boolish = z
    .string()
    .transform(v => ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase()))
    .pipe(z.boolean());

const MIN_SECRET_LENGTH = 32;

const EnvSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().int().min(1).max(65535).default(4000),
        JWT_SECRET: z.string().min(1, 'JWT_SECRET is required — see server/.env.example'),
        ENABLE_DEV_ROUTES: boolish.default(false),
        TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
        /** Where poker.sqlite lives. Overridable so a migration can be rehearsed on a copy. */
        DATA_DIR: z.string().min(1).optional(),
    })
    // A short secret is brute-forceable offline, so it is fatal in production but only a
    // warning locally — a home LAN setup shouldn't stop booting over it mid-game.
    .refine(v => v.NODE_ENV !== 'production' || v.JWT_SECRET.length >= MIN_SECRET_LENGTH, {
        message: `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production`,
        path: ['JWT_SECRET'],
    });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    const issues = parsed.error.issues
        .map(i => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
    console.error(`Invalid server environment:\n${issues}\n\nSee server/.env.example.`);
    process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

if (env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    console.warn(
        `WARNING: JWT_SECRET is ${env.JWT_SECRET.length} characters; ${MIN_SECRET_LENGTH}+ is required before deploying.\n` +
            "         Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"\n" +
            '         Changing it signs everyone out once, which for this app means logging in again.',
    );
}

export const config = {
    nodeEnv: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    jwtSecret: env.JWT_SECRET,
    trustProxy: env.TRUST_PROXY,
    /** The destructive reset endpoint is never reachable in production (Q12). */
    enableDevRoutes: env.ENABLE_DEV_ROUTES && !isProduction,
    dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(serverRoot, 'data'),
    /** In production one process serves both the API and the built SPA (Q103). */
    clientDist: path.join(serverRoot, '..', 'client', 'dist'),
} as const;
