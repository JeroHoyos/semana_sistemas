#!/usr/bin/env node
/* =============================================
   HASH GENERATOR FOR THE CODES
   Usage:   pnpm hash-code "HUEVO SUSTO"
   Prints the hash that goes in `codeHash` in TITLES (src/data/content.ts).

   The page never stores the codes in clear text: only their SHA-256 hash. On redeeming, the person
   types the code, the page computes its hash and compares. This way the code cannot be read by opening
   the source. Beware: a short or easy code can be guessed by hand, so
   use long or non-obvious codes for the important titles.

   The code is normalized the same way as in the page (src/scripts/codes.ts): no accents, uppercase and
   no spaces, hyphens or underscores. "huevo susto", "Huevo-Susto" and "HUEVO SUSTO" are all the same.
   ============================================= */

import { createHash } from 'node:crypto';

// Must be identical to normalizeCode() in src/scripts/codes.ts
function normalizeCode(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
}

const inputs = process.argv.slice(2);
if (!inputs.length) {
  console.error('Usage: pnpm hash-code "CODE" ["ANOTHER CODE" ...]');
  process.exit(1);
}

for (const input of inputs) {
  const normalized = normalizeCode(input);
  const hash = createHash('sha256').update(normalized).digest('hex');
  console.log(`${normalized}\n  ${hash}`);
}
