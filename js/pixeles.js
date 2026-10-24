/* =============================================
   DIBUJOS EN PIXEL ART
   Adornos de la cabecera de algunas actividades (campo "adornos" en data.js).
   Cada dibujo es una cuadrícula: cada letra es un pixel del color que dice
   su paleta y '.' es un pixel vacío. Todas las filas de un dibujo miden lo mismo.
   ============================================= */

// Cifras de 3 × 5 pixeles para los números de las medallas y la camiseta
const CIFRAS_PIXEL = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
};

// Escribe un número de dos cifras sobre un dibujo, con 2 pixeles entre cifra y cifra.
// (x, y) es la esquina de arriba a la izquierda del número; letra es su color en la paleta.
function escribirNumero(filas, numero, x, y, letra) {
  const cuadricula = filas.map((fila) => [...fila]);
  [...numero].forEach((cifra, i) => {
    CIFRAS_PIXEL[cifra].forEach((fila, dy) => {
      [...fila].forEach((pixel, dx) => {
        if (pixel === '#') cuadricula[y + dy][x + i * 5 + dx] = letra;
      });
    });
  });
  return cuadricula.map((fila) => fila.join(''));
}

// Medalla sin número: k borde, c y C cinta (clara y oscura), M brillo, m metal y o sombra
const MOLDE_MEDALLA = [
  '.kkkkk....kkkkk.',
  '.kccCk....kCcck.',
  '..kccCk..kCcck..',
  '..kccCk..kCcck..',
  '...kccCkkCcck...',
  '...kccCkkCcck...',
  '....kccCCcck....',
  '.....kkkkkk.....',
  '...kkMMMmmmkk...',
  '..kMMmmmmmmmmk..',
  '.kMmmmmmmmmmmok.',
  '.kMmmmmmmmmmmok.',
  'kMmmmmmmmmmmmmok',
  'kMmmmmmmmmmmmmok',
  'kMmmmmmmmmmmmmok',
  'kmmmmmmmmmmmmmok',
  'kmmmmmmmmmmmmmok',
  'kmmmmmmmmmmmmmok',
  '.kmmmmmmmmmmmok.',
  '.kmmmmmmmmmmmok.',
  '..kmmmmmmmmmok..',
  '...kkooooookk...',
  '.....kkkkkk.....',
];

// Medalla con su puesto en binario (01, 10, 11) en el centro, del color n de la paleta
function medalla(numero, paleta) {
  return { paleta, filas: escribirNumero(MOLDE_MEDALLA, numero, 4, 12, 'n') };
}

const PIXELES = {
  // Carrera de atletismo: oro, plata y bronce
  medalla01: medalla('01', { k: '#6b4a0f', c: '#e04848', C: '#a3262f', M: '#fff2a8', m: '#f5c518', o: '#d29a0a', n: '#fff8d6' }),
  medalla10: medalla('10', { k: '#3d4652', c: '#3b82e0', C: '#1f4f9e', M: '#ffffff', m: '#c4ccd6', o: '#8f9aa8', n: '#ffffff' }),
  medalla11: medalla('11', { k: '#5c3216', c: '#34a865', C: '#1f7040', M: '#ffc58f', m: '#e0893c', o: '#b5652a', n: '#ffe6cc' }),

  // Torneo de fútbol
  camiseta: {
    paleta: { k: '#0a2c52', j: '#1f78e0', J: '#ffffff', n: '#ffffff' },
    filas: escribirNumero([
      '...kkkk..kkkk...',
      '..kjjjjkkjjjjk..',
      '.kjjjjjjjjjjjjk.',
      'kjjjjjjjjjjjjjjk',
      'kjjjjjjjjjjjjjjk',
      'kJJkjjjjjjjjkJJk',
      'kkkkjjjjjjjjkkkk',
      '...kjjjjjjjjk...',
      '...kjjjjjjjjk...',
      '...kjjjjjjjjk...',
      '...kjjjjjjjjk...',
      '...kjjjjjjjjk...',
      '...kjjjjjjjjk...',
      '...kjjjjjjjjk...',
      '...kkkkkkkkkk...',
    ], '10', 4, 8, 'n'),
  },
  copa: {
    paleta: { k: '#6b4a0f', M: '#fff2a8', m: '#f5c518', o: '#d29a0a', B: '#a8703f', b: '#7a4a2a', p: '#f5c518' },
    filas: [
      '...kkkkkkkkkkkk...',
      'kkkkMMmmmmmmmokkkk',
      'kmk.kMmmmmmmok.kmk',
      'kmk.kMmmmmmmok.kmk',
      'kmk.kMmmmmmmok.kmk',
      '.kmkkMmmmmmmokkmk.',
      '..kkkMmmmmmmokkk..',
      '.....kMmmmmok.....',
      '......kMmmok......',
      '.......kmok.......',
      '.......kmok.......',
      '......kMmmok......',
      '....kkkkkkkkkk....',
      '...kBbbbbbbbbbk...',
      '...kbbppppppbbk...',
      '...kbbbbbbbbbbk...',
      '...kkkkkkkkkkkk...',
    ],
  },
  balon: {
    // El borde es gris para que los parches negros de la orilla no se confundan con él
    paleta: { k: '#6b7685', P: '#1e2630', w: '#ffffff', s: '#c9d1db' },
    filas: [
      '.....kkkkkk.....',
      '...kkwPPPPwkk...',
      '..kwwwwPPwwwwk..',
      '.kwwwwwwwwwwwwk.',
      '.kPwwwwwwwwwwPk.',
      'kPPwwwwPPwwwwPPk',
      'kPPwwwPPPPwwwPPk',
      'kPwwwwPPPPwwwwPk',
      'kwwwwwwPPwwwwwsk',
      'kwwwwwwwwwwwwwsk',
      'kwwwwwwwwwwwwssk',
      '.kwPPwwwwwwPPsk.',
      '.kPPPwwwwwwPPPk.',
      '..kPwwwwwwwsPk..',
      '...kkwwwwsskk...',
      '.....kkkkkk.....',
    ],
  },

  // Torneo de videojuegos
  invasor: {
    paleta: { v: '#7ee081' },
    filas: [
      '..v.....v..',
      '...v...v...',
      '..vvvvvvv..',
      '.vv.vvv.vv.',
      'vvvvvvvvvvv',
      'v.vvvvvvv.v',
      'v.v.....v.v',
      '...vv.vv...',
    ],
  },
  control: {
    paleta: { k: '#2b2d42', g: '#dcdfe6', K: '#4a4e5c', s: '#4a4e5c', a: '#e5484d', b: '#8b5fd6' },
    filas: [
      '...kkkkkkkkkkkkkk...',
      '.kkggggggggggggggkk.',
      'kggggggggggggggggggk',
      'kgggKggggggggggaaggk',
      'kggKKKggsggsgggaaggk',
      'kgggKgggggggbbgggggk',
      'kgggggggggggbbgggggk',
      'kggggggkkkkkkggggggk',
      '.kggggk......kggggk.',
      '..kkkk........kkkk..',
    ],
  },
  corona: {
    paleta: { k: '#6b4a0f', y: '#f5c518', o: '#d29a0a', R: '#e5484d', B: '#3b82e0' },
    filas: [
      '.k.....kk.....k.',
      'kyk...kyyk...kyk',
      'kyyk.kyyyyk.kyyk',
      'kyyykyyyyyykyyyk',
      'kyyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyk',
      'kyRRyyyBByyyRRyk',
      'kyRRyyyBByyyRRyk',
      'kyyyyyyyyyyyyyyk',
      'kooooooooooooook',
      'kkkkkkkkkkkkkkkk',
    ],
  },

  // Karaoke y Just Dance
  nota: {
    paleta: { k: '#5a1638', n: '#ff6fae' },
    filas: [
      '.....kkkkkkkkkkk',
      '.....knnnnnnnnnk',
      '.....knnnnnnnnnk',
      '.....knkkkkkkknk',
      '.....knk.....knk',
      '.....knk.....knk',
      '.....knk.....knk',
      '..kkkknk..kkkknk',
      '.knnnnnk.knnnnnk',
      'knnnnnnkknnnnnnk',
      'knnnnnk.knnnnnk.',
      '.kkkkk...kkkkk..',
    ],
  },
  microfono: {
    paleta: { k: '#2b2d42', G: '#ffffff', g: '#dcdfe6', d: '#8f96a3', b: '#ff6fae', M: '#a988e6', m: '#7b4fc9' },
    filas: [
      '...kkkkkk...',
      '.kkGGggggkk.',
      '.kGgdgdgdgk.',
      'kGgdgdgdgdgk',
      'kgdgdgdgdgdk',
      'kdgdgdgdgdgk',
      'kgdgdgdgdgdk',
      '.kgdgdgdgdk.',
      '.kkkkkkkkkk.',
      '.kbbbbbbbbk.',
      '.kbbbbbbbbk.',
      '..kMmmmmmk..',
      '..kMmmmmmk..',
      '...kMmmmk...',
      '...kMmmmk...',
      '...kMmmmk...',
      '....kMmk....',
      '....kMmk....',
      '....kmmk....',
      '.....kk.....',
    ],
  },
  bolaDisco: {
    paleta: { k: '#1b2440', W: '#ffffff', a: '#a8d4ff', b: '#4f8fd6', c: '#2c5a99' },
    filas: [
      '......kk......',
      '......kk......',
      '....kkkkkk....',
      '..kkaabbaakk..',
      '.kWWbbaabbaak.',
      '.kWabbaabbaak.',
      'kWbbaabbaabbak',
      'kabbaabbaabbak',
      'kbaabbaabbaabk',
      'kbaabbaabbaack',
      'kabbaabbaabbck',
      'kabbaabbaabcck',
      '.kaabbaabbcck.',
      '.kaabbaabccck.',
      '..kkaabbcckk..',
      '....kkkkkk....',
    ],
  },

  // Premiación (va a los lados de la copa del fútbol)
  estrella: {
    paleta: { k: '#6b4a0f', Y: '#fff2a8', y: '#f5c518', o: '#d29a0a' },
    filas: [
      '......k......',
      '.....kYk.....',
      '.....kYk.....',
      '....kYyyk....',
      'kkkkkYyykkkkk',
      'kYYYyyyyyyyok',
      '.kyyyyyyyyok.',
      '..kyyyyyyok..',
      '...kyyyyok...',
      '..kyyokyyok..',
      '.kyok...kyok.',
      '.kkk.....kkk.',
    ],
  },
};

// Convierte un dibujo en SVG. Los pixeles seguidos del mismo color van en un solo rectángulo.
// --ancho y --alto (en pixeles del dibujo) los usa el CSS para que el pixel mida lo mismo en todos.
function dibujarPixeles({ paleta, filas }) {
  const ancho = filas[0].length;
  let rectangulos = '';

  filas.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      let fin = x + 1;
      while (fila[fin] === fila[x]) fin++;
      if (paleta[fila[x]]) {
        rectangulos += `<rect x="${x}" y="${y}" width="${fin - x}" height="1" fill="${paleta[fila[x]]}"/>`;
      }
      x = fin;
    }
  });

  return `<svg class="pixeles" viewBox="0 0 ${ancho} ${filas.length}" style="--ancho: ${ancho}; --alto: ${filas.length}"
    shape-rendering="crispEdges" aria-hidden="true">${rectangulos}</svg>`;
}
