/* =============================================
   SNAKE · JUEGO DE LA SEMANA (SEMANA 1)
   Una culebra con los colores de Python se come los bugs del código.
   Cada bug vale 10 puntos, la hace crecer y la acelera un poquito.
   Chocar con la pared o contigo misma termina la partida.

   El tablero mide lo mismo en todas las pantallas (20 × 15 casillas) y la velocidad no depende
   del computador, para que los puntajes de la tabla se puedan comparar.
   Este archivo solo lleva la partida y la dibuja: la consola (juego-semana.js) le pasa
   los controles, pone el sonido y guarda el puntaje.
   ============================================= */

const SNAKE = {
  columnas: 20,
  filas: 15,
  lado: 8,                 // pixeles de cada casilla: el tablero mide 160 × 120 pixeles y se escala a la pantalla
  largoInicial: 4,
  puntosBug: 10,
  intervaloInicial: 150,   // milisegundos por paso al empezar…
  intervaloMinimo: 70,     // …y lo más rápido que llega a ir
  aceleracion: 3,          // milisegundos menos por cada bug
  duracionChoque: 800,     // lo que parpadea la culebra al chocar
};

// Dibujos de 8 × 8 pixeles, con el mismo formato de pixeles.js (cada letra es un color de la paleta).
// También se usan en la pantalla de inicio de la consola con dibujarPixeles().
const SPRITES_SNAKE = {
  bug: {
    paleta: { l: '#c9d2dc', r: '#8f1d2c', R: '#e5484d', W: '#ffd6d9' },
    filas: [
      '.l....l.',
      '..l..l..',
      '..rrrr..',
      'l.RRRR.l',
      '.RWRrRR.',
      'lRRRrRRl',
      '.RRRrRR.',
      'l.RRRR.l',
    ],
  },
  // Cabeza mirando a la derecha; para las otras direcciones se gira
  cabeza: {
    paleta: { H: '#3776ab', W: '#ffffff', k: '#0b1426' },
    filas: [
      '.HHHHH..',
      'HHHWWHH.',
      'HHHWkHHH',
      'HHHHHHHH',
      'HHHHHHHH',
      'HHHWkHHH',
      'HHHWWHH.',
      '.HHHHH..',
    ],
  },
};

// Colores del cuerpo: se alternan el azul y el amarillo de Python (claro y su sombra)
const COLORES_CUERPO = [
  { claro: '#3776ab', sombra: '#255783' },
  { claro: '#ffd43b', sombra: '#d9a400' },
];
const FONDO_TABLERO = ['#0c1629', '#0f1b31'];

const VECTORES = {
  arriba: [0, -1],
  abajo: [0, 1],
  izquierda: [-1, 0],
  derecha: [1, 0],
};
const OPUESTA = { arriba: 'abajo', abajo: 'arriba', izquierda: 'derecha', derecha: 'izquierda' };

/* lienzo: el <canvas> de la pantalla.
   avisos: { alCambiarPuntaje(puntaje), alTerminar(puntaje, gano), sonar(nombre) }
   Devuelve los controles de la partida. */
function crearSnake(lienzo, avisos = {}) {
  const ctx = lienzo.getContext('2d');
  const anchoTablero = SNAKE.columnas * SNAKE.lado;
  const altoTablero = SNAKE.filas * SNAKE.lado;
  const avisar = (nombre, ...datos) => avisos[nombre]?.(...datos);

  let escala = 1;          // pixeles reales del lienzo por cada pixel del tablero
  let estado = 'listo';    // 'listo' | 'jugando' | 'pausa' | 'fin'
  let culebra, direccion, giros, bug, puntaje, intervalo, flotantes;
  let acumulado = 0;
  let ultimoTiempo = 0;
  let finEn = 0;           // momento del choque, para el parpadeo
  let cuadro = 0;          // id de requestAnimationFrame

  /* ---------- Partida ---------- */

  function preparar() {
    const y = Math.floor(SNAKE.filas / 2);
    const x = Math.floor(SNAKE.columnas / 2) - 3;
    culebra = Array.from({ length: SNAKE.largoInicial }, (_, i) => ({ x: x - i, y }));
    direccion = 'derecha';
    giros = [];
    bug = null;
    puntaje = 0;
    intervalo = SNAKE.intervaloInicial;
    flotantes = [];
    bug = casillaLibre();
    avisar('alCambiarPuntaje', 0);
  }

  // Una casilla al azar donde no haya culebra (null si el tablero está lleno)
  function casillaLibre() {
    const ocupadas = new Set(culebra.map(({ x, y }) => `${x},${y}`));

    const libres = [];
    for (let y = 0; y < SNAKE.filas; y++) {
      for (let x = 0; x < SNAKE.columnas; x++) {
        if (!ocupadas.has(`${x},${y}`)) libres.push({ x, y });
      }
    }
    return libres.length ? libres[Math.floor(Math.random() * libres.length)] : null;
  }

  function paso(ahora) {
    if (giros.length) direccion = giros.shift();
    const [dx, dy] = VECTORES[direccion];
    const nueva = { x: culebra[0].x + dx, y: culebra[0].y + dy };
    const comeBug = bug && nueva.x === bug.x && nueva.y === bug.y;

    // Si no crece, la cola se mueve en este mismo paso: se puede entrar a la casilla que deja libre
    const cuerpo = comeBug ? culebra : culebra.slice(0, -1);
    const fuera = nueva.x < 0 || nueva.y < 0 || nueva.x >= SNAKE.columnas || nueva.y >= SNAKE.filas;
    if (fuera || cuerpo.some(({ x, y }) => x === nueva.x && y === nueva.y)) {
      terminar(ahora, false);
      return;
    }

    culebra.unshift(nueva);
    if (!comeBug) culebra.pop();

    if (comeBug) {
      sumar(SNAKE.puntosBug, nueva, ahora);
      intervalo = Math.max(SNAKE.intervaloMinimo, intervalo - SNAKE.aceleracion);
      avisar('sonar', 'bug');
      bug = casillaLibre();
      if (!bug) terminar(ahora, true);   // no queda espacio: tablero completo
    }
  }

  function sumar(puntos, { x, y }, ahora) {
    puntaje += puntos;
    flotantes.push({ texto: `+${puntos}`, x: x * SNAKE.lado + SNAKE.lado / 2, y: y * SNAKE.lado, desde: ahora });
    avisar('alCambiarPuntaje', puntaje);
  }

  function terminar(ahora, gano) {
    estado = 'fin';
    finEn = ahora;
    giros = [];
    avisar('sonar', gano ? 'record' : 'fin');
    avisar('alTerminar', puntaje, gano);
  }

  /* ---------- Bucle: los pasos van a intervalo fijo y el dibujo a cada cuadro ---------- */

  function bucle(ahora) {
    const animandoChoque = estado === 'fin' && ahora - finEn < SNAKE.duracionChoque;
    if (estado !== 'jugando' && !animandoChoque) {
      cuadro = 0;
      dibujar(ahora);
      return;
    }

    if (estado === 'jugando') {
      acumulado += Math.min(ahora - ultimoTiempo, 250);   // si la pestaña se trabó, no da saltos enormes
      ultimoTiempo = ahora;
      while (acumulado >= intervalo && estado === 'jugando') {
        acumulado -= intervalo;
        paso(ahora);
      }
    }
    dibujar(ahora);
    cuadro = requestAnimationFrame(bucle);
  }

  function arrancarBucle() {
    ultimoTiempo = performance.now();
    acumulado = 0;
    if (!cuadro) cuadro = requestAnimationFrame(bucle);
  }

  /* ---------- Dibujo ---------- */

  // Rectángulo en pixeles del tablero; se redondea a pixeles reales para que los bordes queden nítidos
  function rect(x, y, ancho, alto, color) {
    const x0 = Math.round(x * escala);
    const y0 = Math.round(y * escala);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.round((x + ancho) * escala) - x0, Math.round((y + alto) * escala) - y0);
  }

  // girar: convierte (x, y) del dibujo original a la dirección que se quiere
  function sprite({ paleta, filas }, x0, y0, girar = (x, y) => [x, y], colorFijo = null) {
    filas.forEach((fila, y) => {
      [...fila].forEach((letra, x) => {
        if (!paleta[letra]) return;
        const [gx, gy] = girar(x, y);
        rect(x0 + gx, y0 + gy, 1, 1, colorFijo && letra === 'H' ? colorFijo : paleta[letra]);
      });
    });
  }

  const GIROS = {
    derecha: (x, y) => [x, y],
    izquierda: (x, y) => [7 - x, y],
    abajo: (x, y) => [7 - y, x],
    arriba: (x, y) => [y, 7 - x],
  };

  function dibujar(ahora = performance.now()) {
    if (!culebra) return;
    const L = SNAKE.lado;

    // Tablero a cuadros muy suaves
    for (let y = 0; y < SNAKE.filas; y++) {
      for (let x = 0; x < SNAKE.columnas; x++) {
        rect(x * L, y * L, L, L, FONDO_TABLERO[(x + y) % 2]);
      }
    }

    // El bug se mueve un poquito, como si caminara
    if (bug) {
      const meneo = estado === 'jugando' && Math.floor(ahora / 220) % 2 ? 1 : 0;
      sprite(SPRITES_SNAKE.bug, bug.x * L, bug.y * L - meneo * 0.5);
    }

    dibujarCulebra(ahora);
    dibujarFlotantes(ahora);
  }

  function dibujarCulebra(ahora) {
    // Al chocar parpadea en rojo y blanco
    const chocada = estado === 'fin' && ahora - finEn < SNAKE.duracionChoque;
    const colorChoque = chocada ? (Math.floor((ahora - finEn) / 100) % 2 ? '#ffffff' : '#ff5c5c') : null;
    const L = SNAKE.lado;

    // Del final a la cabeza, para que la cabeza quede encima
    for (let i = culebra.length - 1; i >= 1; i--) {
      const parte = culebra[i];
      const siguiente = culebra[i - 1];          // la parte que va delante (hacia la cabeza)
      const color = COLORES_CUERPO[i % 2];
      const claro = colorChoque || color.claro;
      const sombra = colorChoque || color.sombra;
      const esCola = i === culebra.length - 1;
      const borde = esCola ? 2 : 1;               // la cola es más delgada
      const px = parte.x * L;
      const py = parte.y * L;

      rect(px + borde, py + borde, L - 2 * borde, L - 2 * borde, claro);
      rect(px + borde, py + L - borde - 1, L - 2 * borde, 1, sombra);

      // Puente hasta la parte de adelante, para que el cuerpo se vea seguido
      const dx = siguiente.x - parte.x;
      const dy = siguiente.y - parte.y;
      if (dx === 1) rect(px + L - borde, py + borde, borde + 1, L - 2 * borde, claro);
      if (dx === -1) rect(px - 1, py + borde, borde + 1, L - 2 * borde, claro);
      if (dy === 1) rect(px + borde, py + L - borde, L - 2 * borde, borde + 1, claro);
      if (dy === -1) rect(px + borde, py - 1, L - 2 * borde, borde + 1, claro);
    }

    const cabeza = culebra[0];
    const hx = cabeza.x * L;
    const hy = cabeza.y * L;

    // La lengua sale y entra mientras se mueve
    if (estado === 'jugando' && Math.floor(ahora / 260) % 3 === 0) {
      const LENGUA = {
        derecha: [hx + L, hy + 3.5, 3, 1],
        izquierda: [hx - 3, hy + 3.5, 3, 1],
        abajo: [hx + 3.5, hy + L, 1, 3],
        arriba: [hx + 3.5, hy - 3, 1, 3],
      };
      rect(...LENGUA[direccion], '#ff5c7a');
    }

    sprite(SPRITES_SNAKE.cabeza, hx, hy, GIROS[direccion], colorChoque);
  }

  function dibujarFlotantes(ahora) {
    const DURACION = 650;
    flotantes = flotantes.filter((f) => ahora - f.desde < DURACION);
    if (!flotantes.length) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${Math.round(6 * escala)}px 'Press Start 2P', monospace`;
    for (const f of flotantes) {
      const avance = (ahora - f.desde) / DURACION;
      ctx.globalAlpha = 1 - avance * avance;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(f.texto, f.x * escala, (f.y - 1 - avance * 7) * escala);
    }
    ctx.restore();
  }

  /* ---------- Lo que usa la consola ---------- */

  // El lienzo tiene tantos pixeles como la pantalla (también en pantallas de alta densidad)
  function redimensionar() {
    const ancho = lienzo.clientWidth;
    if (!ancho) return;
    const densidad = window.devicePixelRatio || 1;
    lienzo.width = Math.round(ancho * densidad);
    lienzo.height = Math.round((ancho * altoTablero / anchoTablero) * densidad);
    escala = lienzo.width / anchoTablero;
    ctx.imageSmoothingEnabled = false;
    dibujar();
  }

  function iniciar() {
    preparar();
    estado = 'jugando';
    avisar('sonar', 'inicio');
    arrancarBucle();
  }

  function pausar() {
    if (estado !== 'jugando') return;
    estado = 'pausa';
  }

  function reanudar() {
    if (estado !== 'pausa') return;
    estado = 'jugando';
    arrancarBucle();
  }

  // Los giros se guardan en fila (máximo 3) para que dos teclas rápidas no se pierdan.
  // No se puede devolver sobre sí misma.
  function girar(nueva) {
    if (estado !== 'jugando' || !VECTORES[nueva]) return;
    const anterior = giros.length ? giros[giros.length - 1] : direccion;
    if (nueva === anterior || nueva === OPUESTA[anterior] || giros.length >= 3) return;
    giros.push(nueva);
  }

  preparar();

  return {
    get estado() { return estado; },
    get puntaje() { return puntaje; },
    iniciar,
    pausar,
    reanudar,
    girar,
    redimensionar,
    dibujar,
  };
}
