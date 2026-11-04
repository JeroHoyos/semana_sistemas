#!/usr/bin/env node
/* =============================================
   HASH GENERATOR FOR THE CODES
   Usage:   node tools/hash-code.js "HUEVO SUSTO"
   Prints the hash that goes in `codeHash` in TITLES (js/data.js).

   The page never stores the codes in clear text: only their SHA-256 hash. On redeeming, the person
   types the code, the page computes its hash and compares. This way the code cannot be read by opening
   the source. Beware: a short or easy code can be guessed by hand, so
   use long or non-obvious codes for the important titles.

   The code is normalized the same way as in the page (js/codes.js): no accents, uppercase and
   no spaces, hyphens or underscores. "huevo susto", "Huevo-Susto" and "HUEVO SUSTO" are all the same.
   ============================================= */

const { createHash } = require('node:crypto');

// Must be identical to normalizeCode() in js/codes.js
function normalizeCode(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
}

const inputs = process.argv.slice(2);
if (!inputs.length) {
  console.error('Usage: node tools/hash-code.js "CODE" ["ANOTHER CODE" ...]');
  process.exit(1);
}

for (const input of inputs) {
  const normalized = normalizeCode(input);
  const hash = createHash('sha256').update(normalized).digest('hex');
  console.log(`${normalized}\n  ${hash}`);
}
