/* =============================================
   SNAKE · WEEKLY GAME 1
   A snake in Python's colors eats the bugs in the code.
   Each bug is worth 10 points, makes it grow and speeds it up a little.
   Hitting a wall or yourself ends the run.

   The board is the same on every screen (20 × 15 cells) and the speed does not depend
   on the computer, so leaderboard scores are comparable.
   This file only runs the game and draws it: the console (weekly-game.js) passes it
   the controls, plays the sound and saves the score.
   ============================================= */

const SNAKE = {
  columns: 20,
  rows: 15,
  cell: 8,                 // pixels per cell: the board is 160 × 120 pixels and scales to the screen
  startLength: 4,
  bugPoints: 10,
  startInterval: 150,   // milliseconds per step at the start…
  minInterval: 70,     // …and the fastest it gets
  speedup: 3,          // milliseconds less per bug
  crashDuration: 800,     // how long the snake blinks after crashing
};

// 8 × 8 pixel drawings, in the same format as pixel-art.js (each letter is a palette color).
// Also used on the console's start screen through drawPixelArt().
const SNAKE_SPRITES = {
  bug: {
    palette: { l: '#c9d2dc', r: '#8f1d2c', R: '#e5484d', W: '#ffd6d9' },
    rows: [
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
  // Head looking right; it is rotated for the other directions
  head: {
    palette: { H: '#3776ab', W: '#ffffff', k: '#0b1426' },
    rows: [
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

// Body colors: Python's blue and yellow alternate (light and its shadow)
const BODY_COLORS = [
  { light: '#3776ab', shadow: '#255783' },
  { light: '#ffd43b', shadow: '#d9a400' },
];
const BOARD_COLORS = ['#0c1629', '#0f1b31'];

const VECTORS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Keyboard: arrows or WASD
const SNAKE_KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

/* canvas: the screen's <canvas>.
   events: { onScoreChange(score), onEnd(score, won), playSound(name) }
   Returns the run's controls. */
function createSnake(canvas, events = {}) {
  const ctx = canvas.getContext('2d');
  const boardWidth = SNAKE.columns * SNAKE.cell;
  const boardHeight = SNAKE.rows * SNAKE.cell;
  const emit = (name, ...args) => events[name]?.(...args);

  let scale = 1;          // real canvas pixels per board pixel
  let state = 'ready';    // 'ready' | 'playing' | 'paused' | 'over'
  let snake, direction, turns, bug, score, interval, floaters;
  let accumulated = 0;
  let lastTime = 0;
  let endedAt = 0;           // moment of the crash, for the blinking
  let frame = 0;          // requestAnimationFrame id

  /* ---------- Run ---------- */

  function reset() {
    const y = Math.floor(SNAKE.rows / 2);
    const x = Math.floor(SNAKE.columns / 2) - 3;
    snake = Array.from({ length: SNAKE.startLength }, (_, i) => ({ x: x - i, y }));
    direction = 'right';
    turns = [];
    score = 0;
    interval = SNAKE.startInterval;
    floaters = [];
    bug = freeCell();
    emit('onScoreChange', 0);
  }

  // A random cell with no snake on it (null if the board is full)
  function freeCell() {
    const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`));

    const free = [];
    for (let y = 0; y < SNAKE.rows; y++) {
      for (let x = 0; x < SNAKE.columns; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function step(now) {
    if (turns.length) direction = turns.shift();
    const [dx, dy] = VECTORS[direction];
    const next = { x: snake[0].x + dx, y: snake[0].y + dy };
    const eatsBug = bug && next.x === bug.x && next.y === bug.y;

    // If it does not grow, the tail moves on this same step: the cell it leaves can be entered
    const body = eatsBug ? snake : snake.slice(0, -1);
    const outside = next.x < 0 || next.y < 0 || next.x >= SNAKE.columns || next.y >= SNAKE.rows;
    if (outside || body.some(({ x, y }) => x === next.x && y === next.y)) {
      finish(now, false);
      return;
    }

    snake.unshift(next);
    if (!eatsBug) snake.pop();

    if (eatsBug) {
      addPoints(SNAKE.bugPoints, next, now);
      interval = Math.max(SNAKE.minInterval, interval - SNAKE.speedup);
      emit('playSound', 'bug');
      bug = freeCell();
      if (!bug) finish(now, true);   // no room left: board complete
    }
  }

  function addPoints(points, { x, y }, now) {
    score += points;
    floaters.push({ text: `+${points}`, x: x * SNAKE.cell + SNAKE.cell / 2, y: y * SNAKE.cell, since: now });
    emit('onScoreChange', score);
  }

  function finish(now, won) {
    state = 'over';
    endedAt = now;
    turns = [];
    emit('playSound', won ? 'record' : 'over');
    emit('onEnd', score, won);
  }

  /* ---------- Loop: steps run at a fixed interval, drawing on every frame ---------- */

  function loop(now) {
    const animatingCrash = state === 'over' && now - endedAt < SNAKE.crashDuration;
    if (state !== 'playing' && !animatingCrash) {
      frame = 0;
      draw(now);
      return;
    }

    if (state === 'playing') {
      accumulated += Math.min(now - lastTime, 250);   // if the tab froze, avoid huge jumps
      lastTime = now;
      while (accumulated >= interval && state === 'playing') {
        accumulated -= interval;
        step(now);
      }
    }
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function startLoop() {
    lastTime = performance.now();
    accumulated = 0;
    if (!frame) frame = requestAnimationFrame(loop);
  }

  /* ---------- Drawing ---------- */

  // Rectangle in board pixels; rounded to real pixels to keep the edges sharp
  function rect(x, y, width, height, color) {
    const x0 = Math.round(x * scale);
    const y0 = Math.round(y * scale);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.round((x + width) * scale) - x0, Math.round((y + height) * scale) - y0);
  }

  // rotate: converts (x, y) of the original drawing to the wanted direction
  function sprite({ palette, rows }, x0, y0, turn = (x, y) => [x, y], fixedColor = null) {
    rows.forEach((row, y) => {
      [...row].forEach((letter, x) => {
        if (!palette[letter]) return;
        const [gx, gy] = turn(x, y);
        rect(x0 + gx, y0 + gy, 1, 1, fixedColor && letter === 'H' ? fixedColor : palette[letter]);
      });
    });
  }

  const ROTATIONS = {
    right: (x, y) => [x, y],
    left: (x, y) => [7 - x, y],
    down: (x, y) => [7 - y, x],
    up: (x, y) => [y, 7 - x],
  };

  function draw(now = performance.now()) {
    if (!snake) return;
    const L = SNAKE.cell;

    // Very soft checkered board
    for (let y = 0; y < SNAKE.rows; y++) {
      for (let x = 0; x < SNAKE.columns; x++) {
        rect(x * L, y * L, L, L, BOARD_COLORS[(x + y) % 2]);
      }
    }

    // The bug moves a little, as if walking
    if (bug) {
      const wiggle = state === 'playing' && Math.floor(now / 220) % 2 ? 1 : 0;
      sprite(SNAKE_SPRITES.bug, bug.x * L, bug.y * L - wiggle * 0.5);
    }

    drawSnake(now);
    drawFloaters(now);
  }

  function drawSnake(now) {
    // After crashing it blinks red and white
    const crashed = state === 'over' && now - endedAt < SNAKE.crashDuration;
    const crashColor = crashed ? (Math.floor((now - endedAt) / 100) % 2 ? '#ffffff' : '#ff5c5c') : null;
    const L = SNAKE.cell;

    // From tail to head, so the head ends up on top
    for (let i = snake.length - 1; i >= 1; i--) {
      const part = snake[i];
      const ahead = snake[i - 1];          // the part in front (towards the head)
      const color = BODY_COLORS[i % 2];
      const light = crashColor || color.light;
      const shadow = crashColor || color.shadow;
      const isTail = i === snake.length - 1;
      const inset = isTail ? 2 : 1;               // the tail is thinner
      const px = part.x * L;
      const py = part.y * L;

      rect(px + inset, py + inset, L - 2 * inset, L - 2 * inset, light);
      rect(px + inset, py + L - inset - 1, L - 2 * inset, 1, shadow);

      // Bridge to the part in front, so the body looks continuous
      const dx = ahead.x - part.x;
      const dy = ahead.y - part.y;
      if (dx === 1) rect(px + L - inset, py + inset, inset + 1, L - 2 * inset, light);
      if (dx === -1) rect(px - 1, py + inset, inset + 1, L - 2 * inset, light);
      if (dy === 1) rect(px + inset, py + L - inset, L - 2 * inset, inset + 1, light);
      if (dy === -1) rect(px + inset, py - 1, L - 2 * inset, inset + 1, light);
    }

    const head = snake[0];
    const hx = head.x * L;
    const hy = head.y * L;

    // The tongue flicks in and out while moving
    if (state === 'playing' && Math.floor(now / 260) % 3 === 0) {
      const TONGUE = {
        right: [hx + L, hy + 3.5, 3, 1],
        left: [hx - 3, hy + 3.5, 3, 1],
        down: [hx + 3.5, hy + L, 1, 3],
        up: [hx + 3.5, hy - 3, 1, 3],
      };
      rect(...TONGUE[direction], '#ff5c7a');
    }

    sprite(SNAKE_SPRITES.head, hx, hy, ROTATIONS[direction], crashColor);
  }

  function drawFloaters(now) {
    const DURATION = 650;
    floaters = floaters.filter((f) => now - f.since < DURATION);
    if (!floaters.length) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${Math.round(6 * scale)}px 'Press Start 2P', monospace`;
    for (const f of floaters) {
      const progress = (now - f.since) / DURATION;
      ctx.globalAlpha = 1 - progress * progress;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(f.text, f.x * scale, (f.y - 1 - progress * 7) * scale);
    }
    ctx.restore();
  }

  /* ---------- What the console uses ---------- */

  // The canvas has as many pixels as the screen (also on high density screens)
  function resize() {
    const width = canvas.clientWidth;
    if (!width) return;
    const density = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * density);
    canvas.height = Math.round((width * boardHeight / boardWidth) * density);
    scale = canvas.width / boardWidth;
    ctx.imageSmoothingEnabled = false;
    draw();
  }

  function start() {
    reset();
    state = 'playing';
    emit('playSound', 'start');
    startLoop();
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    startLoop();
  }

  // Turns are queued (3 at most) so two quick keys are not lost.
  // It cannot turn back on itself.
  function turn(next) {
    if (state !== 'playing' || !VECTORS[next]) return;
    const previous = turns.length ? turns[turns.length - 1] : direction;
    if (next === previous || next === OPPOSITE[previous] || turns.length >= 3) return;
    turns.push(next);
  }

  // code: KeyboardEvent.code. Returns true if the key belongs to the game (the console then ignores it)
  function key(code, pressed) {
    const direction = SNAKE_KEYS[code];
    if (!direction) return false;
    if (pressed) turn(direction);
    return true;
  }

  // The d-pad and swiping: turns on press (release does nothing)
  function press(button, pressed) {
    if (pressed) turn(button);
  }

  reset();

  return {
    get state() { return state; },
    get score() { return score; },
    start,
    pause,
    resume,
    key,
    press,
    resize,
    draw,
  };
}


/* ---------- The game's cartridge for the console ---------- */

const SNAKE_CARTRIDGE = {
  id: 'snake',
  name: 'Snake',
  scoring: 'points',
  create: (canvas, events) => createSnake(canvas, events),
  splash: {
    text: 'Atrapa los bugs y no choques',
    items: () => `<span class="overlay__item"><span class="overlay__sprite">${drawPixelArt(SNAKE_SPRITES.bug)}</span>10 pts</span>`,
    keyboardHelp: 'Flechas o WASD · P pausa · M sonido',
    touchHelp: 'Cruceta o desliza el dedo',
  },
  controls: {
    keyboard: [['Flechas o WASD', 'Girar'], ['P', 'Pausa'], ['M', 'Sonido']],
    touch: [['Cruceta', 'Girar'], ['Deslizar el dedo', 'Girar'], ['A', 'Pausa']],
  },
  end: { title: 'Fin del juego', noPoints: 'Ni un bug esta vez. ¡Otra!' },
};
