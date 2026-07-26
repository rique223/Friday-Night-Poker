import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildOpenApiDocument } from '../src/openapi.js';

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'openapi.json');
writeFileSync(outFile, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`Wrote ${outFile}`);
