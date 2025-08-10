import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import { initDb } from './lib/db.js';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 4000;

async function start() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
    });
}
start();
