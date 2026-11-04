#!/usr/bin/env node
/* =============================================
   AUTOMATIC VERSION BUMP
   Sets the PROJECT_VERSION constant in js/data.js to the current timestamp,
   which closes old sessions in users' browsers.
   ============================================= */

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'js', 'data.js');
const content = fs.readFileSync(dataFile, 'utf8');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const version = `v${stamp}`;

fs.writeFileSync(dataFile, content.replace(/const PROJECT_VERSION = '[^']*';/, `const PROJECT_VERSION = '${version}';`), 'utf8');
console.log(`[Version] Project set to: ${version}`);
