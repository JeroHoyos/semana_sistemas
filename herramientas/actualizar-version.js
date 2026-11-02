#!/usr/bin/env node
/* =============================================
   ACTUALIZADOR AUTOMÁTICO DE VERSIÓN
   Actualiza la constante VERSION_PROYECTO en js/data.js
   con la marca de tiempo actual para invalidar sesiones
   antiguas en los navegadores de los usuarios.
   ============================================= */

const fs = require('fs');
const path = require('path');

const archivoData = path.join(__dirname, '..', 'js', 'data.js');
let contenido = fs.readFileSync(archivoData, 'utf8');

const ahora = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${ahora.getFullYear()}.${pad(ahora.getMonth() + 1)}.${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
const nuevaVersion = `v${stamp}`;

if (contenido.includes('VERSION_PROYECTO')) {
  contenido = contenido.replace(/const VERSION_PROYECTO = '[^']*';/, `const VERSION_PROYECTO = '${nuevaVersion}';`);
} else {
  contenido = `const VERSION_PROYECTO = '${nuevaVersion}';\n` + contenido;
}

fs.writeFileSync(archivoData, contenido, 'utf8');
console.log(`[Versión] Proyecto actualizado a: ${nuevaVersion}`);
