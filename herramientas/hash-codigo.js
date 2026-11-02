#!/usr/bin/env node
/* =============================================
   GENERADOR DE HUELLAS PARA LOS CÓDIGOS
   Uso:   node herramientas/hash-codigo.js "HUEVO SUSTO"
   Imprime la huella que va en `codigo` de TITULOS (js/data.js).

   La página nunca guarda los códigos en claro: solo su huella (SHA-256). Al canjear, la persona
   escribe el código, la página calcula su huella y la compara. Así no se lee el código abriendo
   el código fuente. Ojo: un código corto o fácil de adivinar se puede probar a mano, así que
   usa códigos largos o poco obvios para los títulos importantes.

   El código se normaliza igual que en la página (js/codigos.js): sin tildes, en mayúsculas y
   sin espacios. "huevo susto", "Huevo-Susto" y "HUEVO SUSTO" NO son lo mismo por el guion,
   pero "huevo susto" y "HUEVO  SUSTO" sí.
   ============================================= */

const { createHash } = require('node:crypto');

// Debe ser idéntica a normalizarCodigo() de js/codigos.js
function normalizarCodigo(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');
}

const entradas = process.argv.slice(2);
if (!entradas.length) {
  console.error('Uso: node herramientas/hash-codigo.js "CÓDIGO" ["OTRO CÓDIGO" ...]');
  process.exit(1);
}

for (const entrada of entradas) {
  const normalizado = normalizarCodigo(entrada);
  const huella = createHash('sha256').update(normalizado).digest('hex');
  console.log(`${normalizado}\n  ${huella}`);
}
