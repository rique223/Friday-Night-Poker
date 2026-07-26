import { closeDb, initDb } from './db/index.js';
import app from './app.js';
import { config } from './config.js';

async function start(): Promise<void> {
    await initDb();

    const server = app.listen(config.port, () => {
        console.log(`Server listening on http://localhost:${config.port} (${config.nodeEnv})`);
    });

    // Q50: previously a SIGTERM killed in-flight requests and left the WAL unchecked.
    let shuttingDown = false;
    const shutdown = (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`${signal} received, shutting down`);

        const forced = setTimeout(() => {
            console.error('Shutdown timed out, exiting');
            process.exit(1);
        }, 10_000);
        forced.unref();

        server.close(async closeError => {
            try {
                await closeDb();
            } catch (dbError) {
                console.error('Failed to close database', dbError);
            }
            process.exit(closeError ? 1 : 0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

// Q50: `start()` had no `.catch`, so a failed `initDb()` surfaced as an unhandled
// rejection and a bare stack trace instead of a usable message.
start().catch((error: unknown) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
