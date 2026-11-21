#!/usr/bin/env node
/* =============================================
   AUTOMATIC VERSION BUMP
   Sets the PROJECT_VERSION constant in src/data/content.ts to the current timestamp,
   which closes old sessions in users' browsers.
   ============================================= */

import fs from 'node:fs';

const dataFile = new URL('../src/data/content.ts', import.meta.url);
const content = fs.readFileSync(dataFile, 'utf8');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const version = `v${stamp}`;

fs.writeFileSync(dataFile, content.replace(/const PROJECT_VERSION = '[^']*';/, `const PROJECT_VERSION = '${version}';`), 'utf8');
console.log(`[Version] Project set to: ${version}`);
