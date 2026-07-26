import { closeDb, initDb } from '../db/index.js';

/** Applies any pending migrations and exits. `initDb` also does this on every boot. */
initDb()
    .then(async db => {
        const applied = await db.all<{ id: number; name: string; applied_at: string }[]>(
            'SELECT id, name, applied_at FROM schema_migrations ORDER BY id',
        );
        console.log('Applied migrations:');
        for (const row of applied) console.log(`  ${row.id}_${row.name} (${row.applied_at})`);
        await closeDb();
        process.exit(0);
    })
    .catch((error: unknown) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
