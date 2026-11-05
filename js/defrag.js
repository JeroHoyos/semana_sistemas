/* =============================================
   DEFRAG · WEEKLY GAME 3
   Memory fragments (four-block pieces) fall and must be fitted into the well:
   each complete row is freed. Four rows at once are a ¡Defrag!
   The run ends when memory fills up to the top.

   Points (the same ones that go to the leaderboard): each row cleared is worth 50, whatever the level
   or how many go at once. Dropping a piece gives nothing, so every score is a multiple of 50.
   Every 5 rows the level goes up: pieces fall faster and the music speeds up.

   Pieces come from a bag of all seven (no long droughts of the one you need), rotate with
   the same rules as modern block games (if they collide on rotation, they try shifting a little),
   and wait a moment on the floor before locking. Everything runs on time, not frames:
   speed does not depend on the computer, so leaderboard scores are comparable.

   The music is an original 8-bit song played with Web Audio (pulse, triangle and noise).
   This file runs the game, draws it and plays its sound: the console (weekly-game.js)
   passes it the controls and saves the score.
   ============================================= */

const DEFRAG = {
  columns: 10,
  rows: 20,               // visible rows…
  hiddenRows: 2,              // …and two more above the well, where pieces appear
  cell: 6,                 // units per cell: the screen is 192 × 144 units and scales
  width: 192,
  height: 144,
  rowsPerLevel: 5,
  maxLevel: 20,
  headStart: 4,            // level 1 already falls like level 5 of the usual speed curve
  das: 170,                // ms to hold left or right before the piece auto-repeats…
  arr: 40,                 // …and how many ms between cells while it repeats
  lockDelay: 250,            // ms a piece can stay on the floor before locking
  lockResets: 5,    // times that moving or rotating it on the floor gives that time back
  clearDuration: 320,   // ms that full rows blink before being removed
  fillDuration: 1100,   // ms the well takes to turn gray on losing
  volume: 0.45,
};

// The seven pieces in their spawn position and their colors (light, base and shadow of each block)
const DEFRAG_PIECES = {
  I: { shape: ['....', 'IIII', '....', '....'], colors: { light: '#ff8a8d', base: '#e5484d', shadow: '#8f1d2c' } },
  J: { shape: ['J..', 'JJJ', '...'], colors: { light: '#7fe3ec', base: '#22b5c4', shadow: '#126b75' } },
  L: { shape: ['..L', 'LLL', '...'], colors: { light: '#ffbf8f', base: '#ff8c42', shadow: '#a8500f' } },
  O: { shape: ['.OO', '.OO', '...'], colors: { light: '#fff09a', base: '#ffd23f', shadow: '#b5870f' } },
  S: { shape: ['.SS', 'SS.', '...'], colors: { light: '#8fe6a0', base: '#46b85c', shadow: '#1f6e33' } },
  T: { shape: ['.T.', 'TTT', '...'], colors: { light: '#6aa6dc', base: '#3776ab', shadow: '#1d4670' } },
  Z: { shape: ['ZZ.', '.ZZ', '...'], colors: { light: '#d1a3ff', base: '#a35de0', shadow: '#5b2a8a' } },
};
const DEFRAG_FILL_COLORS = { light: '#8a94a8', base: '#5b6478', shadow: '#2e3442', shine: '#b8c0d0' };
const DEFRAG_FLASH_COLORS = { light: '#ffffff', base: '#ffffff', shadow: '#c9d2dc' };

// Rotates a shape a quarter turn clockwise
function rotateShape(rows) {
  const n = rows.length;
  return rows.map((_, y) => rows.map((__, x) => rows[n - 1 - x][y]).join(''));
}

// The [x, y] cells a shape takes inside its box
function shapeCells(rows) {
  const cells = [];
  rows.forEach((row, y) => [...row].forEach((letter, x) => {
    if (letter !== '.') cells.push([x, y]);
  }));
  return cells;
}

// The four rotations of each piece (0 spawn, 1 clockwise, 2 upside down, 3 counterclockwise).
// The square does not rotate.
const DEFRAG_SHAPES = Object.fromEntries(Object.entries(DEFRAG_PIECES).map(([type, { shape }]) => {
  const rotations = [shape];
  for (let i = 1; i < 4; i++) rotations.push(type === 'O' ? shape : rotateShape(rotations[i - 1]));
  return [type, rotations.map(shapeCells)];
}));

// If the piece collides on rotation, it tries shifting to these places, in order (x to the right, y upwards).
// These are the kick tables of modern block games: the bar (I) has its own.
const DEFRAG_KICKS = {
  normal: {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  },
  I: {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  },
};

const DEFRAG_ROW_POINTS = 50;
const DEFRAG_ROW_NAMES = ['', '1 FILA', 'DOBLE', 'TRIPLE', '¡DEFRAG!'];

// Keyboard: arrows or WASD to move, up (or X) rotates, Z rotates back, Space drops and C (or Shift) holds
const DEFRAG_KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  ArrowUp: 'rotate', KeyW: 'rotate', KeyX: 'rotate',
  KeyZ: 'rotateBack', KeyQ: 'rotateBack',
  Space: 'drop',
  KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold',
};

// Console d-pad (and swiping) and buttons: up drops the piece, A rotates and B holds
const DEFRAG_GAMEPAD = {
  left: 'left',
  right: 'right',
  down: 'down',
  up: 'drop',
  a: 'rotate',
  b: 'hold',
};


/* ---------- Music: an original song in A minor, 16 bars that repeat ----------
   Each bar has 8 eighth notes. Melody: note and how many eighths it lasts ('-' is a rest).
   The bass comes from each bar's chord (root and octave) and an arpeggio joins in the second part. */

const DEFRAG_SONG = {
  tempo: 140,   // quarter notes per minute at level 1
  melody: [
    'A4:1 A4:1 C5:1 E5:2 D5:1 C5:1 D5:1',
    'E5:2 A5:2 G5:1 E5:1 C5:2',
    'F5:1 E5:1 D5:1 C5:2 A4:1 C5:2',
    'B4:1 C5:1 D5:2 G4:2 B4:2',
    'A4:1 A4:1 C5:1 E5:2 D5:1 C5:1 D5:1',
    'E5:2 A5:1 B5:1 C6:2 B5:1 A5:1',
    'A5:1 G5:1 F5:1 E5:1 D5:2 C5:1 D5:1',
    'E5:2 D5:1 B4:1 G#4:2 -:2',
    'D5:2 F5:1 A5:2 F5:1 D5:1 F5:1',
    'E5:2 D5:1 C5:1 D5:4',
    'C5:2 E5:1 A5:2 E5:1 C5:1 E5:1',
    'D5:2 C5:1 B4:1 C5:4',
    'A4:1 C5:1 F5:2 E5:1 F5:1 A5:2',
    'G5:1 F5:1 E5:1 D5:1 B4:2 D5:2',
    'E5:1 F5:1 E5:1 D#5:1 E5:2 B4:2',
    'E5:1 D5:1 C5:1 B4:1 G#4:2 E4:2',
  ],
  chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E', 'Dm', 'Dm', 'Am', 'Am', 'F', 'G', 'E', 'E'],
  arpeggioFromBar: 8,   // bar where the arpeggio comes in
};

// MIDI notes of each chord: the first is the bass root and the other three, the arpeggio
const DEFRAG_CHORDS = {
  Am: [45, 69, 72, 76],
  F: [41, 65, 69, 72],
  G: [43, 67, 71, 74],
  E: [40, 64, 68, 71],
  Dm: [38, 62, 65, 69],
};
const DEFRAG_BASS = [0, 12, 0, 12, 0, 12, 7, 12];   // semitones above the root on each eighth

// 'G#4' → 68
function noteToMidi(name) {
  const [, letter, accidental, octave] = /^([A-G])(#?)(\d)$/.exec(name);
  return 12 * (Number(octave) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (accidental ? 1 : 0);
}

// The melody eighth by eighth: for each one, the note starting there (or null)
const DEFRAG_MELODY = DEFRAG_SONG.melody.flatMap((bar) => bar.split(' ').flatMap((event) => {
  const [note, duration] = event.split(':');
  const steps = Number(duration);
  const start = note === '-' ? null : { midi: noteToMidi(note), steps };
  return [start, ...Array(steps - 1).fill(null)];
}));

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);


/* ---------- Sound: music and effects with Web Audio, like an 8-bit chip ---------- */

function createDefragSound() {
  let context = null;
  let output = null;       // master volume (0 with sound off)
  let sfxBus = null;
  let noise = null;        // half a second of white noise: cymbals and snare
  let widePulse = null;   // 25% pulse wave: the melody voice
  let thinPulse = null;    // 12.5%: the arpeggio
  let on = true;
  const music = { bus: null, step: 0, nextTime: 0, timer: 0, speed: 1 };
  const STEPS = DEFRAG_MELODY.length;

  // Pulse wave with the given duty cycle (as on old console chips), from its Fourier series
  function pulseWave(duty) {
    const real = new Float32Array(64);
    const imag = new Float32Array(64);
    for (let k = 1; k < 64; k++) {
      real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
      imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
    }
    return context.createPeriodicWave(real, imag);
  }

  // Called when pressing Play: the browser only allows sound after a click or a key press
  function prepare() {
    try {
      if (!context) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        context = new AudioCtx();
        output = context.createGain();
        output.connect(context.destination);
        sfxBus = context.createGain();
        sfxBus.connect(output);
        widePulse = pulseWave(0.25);
        thinPulse = pulseWave(0.125);
        noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        applyVolume();
      }
      resume();
    } catch {
      context = null;
    }
  }

  function applyVolume() {
    if (output) output.gain.value = on ? DEFRAG.volume : 0;
  }

  // A note: attacks at once, drops a little while sounding and cuts just before the next one
  function tone(dest, start, duration, freq, { wave = 'square', volume = 0.1, to = 0, sustain = 0.7 } = {}) {
    const osc = context.createOscillator();
    if (typeof wave === 'string') osc.type = wave;
    else osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(freq, start);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, start + duration);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.004);
    envelope.gain.setTargetAtTime(volume * sustain, start + 0.004, duration * 0.3);
    envelope.gain.setTargetAtTime(0, start + duration * 0.85, 0.012);
    osc.connect(envelope).connect(dest);
    osc.start(start);
    osc.stop(start + duration + 0.1);
  }

  // A filtered noise hit: cymbal (high pass) or snare (band pass)
  function hit(dest, start, duration, volume, filterType, freq) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const bandFilter = context.createBiquadFilter();
    bandFilter.type = filterType;
    bandFilter.frequency.value = freq;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(volume, start);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(bandFilter).connect(envelope).connect(dest);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  /* ----- Music ----- */

  function playStep(step, start, eighth) {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const [root, ...arpeggio] = DEFRAG_CHORDS[DEFRAG_SONG.chords[bar]];
    const bus = music.bus;

    const note = DEFRAG_MELODY[step];
    if (note) tone(bus, start, note.steps * eighth, midiToHz(note.midi), { wave: widePulse, volume: 0.16 });

    tone(bus, start, eighth * 0.9, midiToHz(root + DEFRAG_BASS[beat]), { wave: 'triangle', volume: 0.32, sustain: 0.9 });

    if (bar >= DEFRAG_SONG.arpeggioFromBar) {
      for (let k = 0; k < 2; k++) {
        tone(bus, start + k * eighth / 2, eighth / 2, midiToHz(arpeggio[(beat * 2 + k) % 3]), { wave: thinPulse, volume: 0.05 });
      }
    }

    // Kick on 1 and 3, snare on 2 and 4 (and a roll at the end of each part), off-beat cymbal
    if (beat === 0 || beat === 4) tone(bus, start, 0.12, 150, { wave: 'sine', volume: 0.5, to: 42, sustain: 0.6 });
    if (beat === 2 || beat === 6 || (bar % 8 === 7 && beat >= 5)) hit(bus, start, 0.12, 0.22, 'bandpass', 1800);
    if (beat % 2 === 1) hit(bus, start, 0.035, 0.12, 'highpass', 7000);
  }

  // Scheduled slightly ahead of the audio clock, so it never lags even if the page stutters
  function scheduleMusic() {
    if (!context || !music.bus || context.state !== 'running') return;
    const eighth = 30 / (DEFRAG_SONG.tempo * music.speed);
    const now = context.currentTime;
    if (music.nextTime < now - 0.1) music.nextTime = now + 0.02;
    while (music.nextTime < now + 0.15) {
      if (on) playStep(music.step, music.nextTime, eighth);
      music.nextTime += eighth;
      music.step = (music.step + 1) % STEPS;
    }
  }

  function startMusic() {
    if (!context) return;
    stopMusic();
    music.bus = context.createGain();
    music.bus.gain.value = 0.6;
    music.bus.connect(output);
    music.step = 0;
    music.nextTime = context.currentTime + 0.35;   // after the start beep
    music.timer = setInterval(scheduleMusic, 30);
    scheduleMusic();
  }

  // Fades out in an instant (notes already scheduled do not keep ringing)
  function stopMusic() {
    clearInterval(music.timer);
    music.timer = 0;
    const bus = music.bus;
    music.bus = null;
    if (!bus) return;
    try {
      bus.gain.setTargetAtTime(0, context.currentTime, 0.03);
      setTimeout(() => bus.disconnect(), 400);
    } catch {
      // Context closed: nothing is playing anymore
    }
  }

  /* ----- Effects ----- */

  const SFX = {
    move: (t) => tone(sfxBus, t, 0.025, 440, { volume: 0.035 }),
    rotate: (t) => tone(sfxBus, t, 0.05, 520, { wave: widePulse, volume: 0.08, to: 900 }),
    lock: (t) => tone(sfxBus, t, 0.08, 180, { wave: 'triangle', volume: 0.35, to: 70 }),
    drop: (t) => {
      tone(sfxBus, t, 0.08, 900, { volume: 0.06, to: 140 });
      tone(sfxBus, t + 0.06, 0.09, 170, { wave: 'triangle', volume: 0.4, to: 60 });
    },
    hold: (t) => {
      tone(sfxBus, t, 0.05, 660, { wave: widePulse, volume: 0.08 });
      tone(sfxBus, t + 0.06, 0.07, 990, { wave: widePulse, volume: 0.08 });
    },
    rows: (t, count) => {
      const notes = count === 4 ? [72, 76, 79, 84, 88, 91, 96] : [72, 76, 79, 84].slice(0, count + 1);
      notes.forEach((midi, i) => tone(sfxBus, t + i * 0.055, i === notes.length - 1 ? 0.22 : 0.08, midiToHz(midi), { wave: widePulse, volume: 0.1 }));
      if (count === 4) hit(sfxBus, t, 0.5, 0.12, 'highpass', 5000);
    },
    level: (t) => [67, 72, 76, 79, 84].forEach((midi, i) => tone(sfxBus, t + 0.35 + i * 0.07, 0.11, midiToHz(midi), { volume: 0.07 })),
  };

  function sfx(name, ...args) {
    if (!context || !on) return;
    try {
      SFX[name](context.currentTime + 0.005, ...args);
    } catch {
      // An effect that fails to play does not stop the game
    }
  }

  function resume() {
    context?.resume?.()?.catch?.(() => {});
  }

  return {
    prepare,
    sfx,
    startMusic,
    stopMusic,
    speed(value) { music.speed = value; },
    pause() { context?.suspend?.()?.catch?.(() => {}); },
    resume,
    setSound(value) {
      on = value;
      applyVolume();
    },
  };
}


/* ---------- The run ----------
   canvas: the screen's <canvas>.
   events: { onScoreChange(score), onEnd(score, won, detail), playSound(name) }
   Returns the run's controls. */

function createDefrag(canvas, events = {}) {
  const ctx = canvas.getContext('2d');
  const emit = (name, ...args) => events[name]?.(...args);
  const audio = createDefragSound();

  const COLUMNS = DEFRAG.columns;
  const TOTAL_ROWS = DEFRAG.rows + DEFRAG.hiddenRows;
  const L = DEFRAG.cell;
  // The well sits in the center. Its row 0 (hidden) draws at the very top; visible rows start below the hidden ones.
  const WELL_X = (DEFRAG.width - COLUMNS * L) / 2;
  const WELL_TOP = DEFRAG.hiddenRows * L;
  const WELL_BOTTOM = TOTAL_ROWS * L;
  const LEFT_CENTER = WELL_X / 2;
  const RIGHT_CENTER = DEFRAG.width - WELL_X / 2;

  let scale = 1;          // real canvas pixels per screen unit
  let state = 'ready';    // 'ready' | 'playing' | 'paused' | 'over'
  let well;                // rows × columns: null or the letter of the piece that left that block
  let piece;               // { type, rotation, x, y } the falling piece (null while rows are removed)
  let queue, held, canHold;
  let score, rowsCleared, level;
  let fallTime = 0;           // ms accumulated towards the next falling cell
  let lockTime = 0;          // ms it has been on the floor
  let resets = 0;       // times its floor time was given back
  let lowestRow = 0;     // the lowest row it has reached (going lower gives the resets back)
  let clearing = null;     // { rows, from } while full rows blink
  let trail = null;       // the trail of a hard-dropped piece
  let floaters = [];      // texts that rise and fade over the well
  let das = null;          // { dx, t, steps } the direction being held
  let softDrop = false;       // soft dropping
  const origins = new Map();   // 'ArrowLeft', 'pad:a'… → action it holds
  let lastTime = 0;
  let frame = 0;
  let endedAt = 0;

  /* ---------- Pieces and well ---------- */

  const cellsOf = ({ type, rotation, x, y }) => DEFRAG_SHAPES[type][rotation].map(([cx, cy]) => [x + cx, y + cy]);

  function collides(type, rotation, x, y) {
    return DEFRAG_SHAPES[type][rotation].some(([cx, cy]) => {
      const px = x + cx;
      const py = y + cy;
      return px < 0 || px >= COLUMNS || py < 0 || py >= TOTAL_ROWS || well[py][px] !== null;
    });
  }

  const onFloor = () => collides(piece.type, piece.rotation, piece.x, piece.y + 1);
  const hasPiece = () => state === 'playing' && piece !== null && !clearing;

  // Bag of seven: all seven pieces come out shuffled, then another bag
  function fillQueue() {
    while (queue.length < 7) {
      const bag = Object.keys(DEFRAG_PIECES);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      queue.push(...bag);
    }
  }

  function nextFromQueue() {
    const type = queue.shift();
    fillQueue();
    return type;
  }

  // Appears at the top, in the hidden rows, and moves down one row if it can (so it shows whole from the start).
  // If it does not fit, memory is full.
  function spawn(type) {
    piece = { type, rotation: 0, x: 3, y: 0 };
    fallTime = 0;
    lockTime = 0;
    resets = 0;
    if (collides(type, 0, piece.x, 0)) {
      lose(performance.now());
      return;
    }
    if (!collides(type, 0, piece.x, 1)) piece.y = 1;
    lowestRow = piece.y;
  }

  function nextPiece() {
    canHold = true;
    spawn(nextFromQueue());
  }

  // On the floor, moving or rotating it gives back the time before locking (up to lockResets times).
  // If it gets lower than ever, they all come back.
  function afterMove() {
    if (piece.y > lowestRow) {
      lowestRow = piece.y;
      resets = 0;
    }
    if (resets < DEFRAG.lockResets) {
      if (lockTime > 0 || onFloor()) resets++;
      lockTime = 0;
    }
  }

  function move(dx) {
    if (collides(piece.type, piece.rotation, piece.x + dx, piece.y)) return false;
    piece.x += dx;
    afterMove();
    audio.sfx('move');
    return true;
  }

  function fall() {
    if (collides(piece.type, piece.rotation, piece.x, piece.y + 1)) return false;
    piece.y++;
    if (piece.y > lowestRow) {
      lowestRow = piece.y;
      resets = 0;
      lockTime = 0;
    }
    return true;
  }

  // dir: 1 clockwise, -1 counterclockwise. If it collides, it tries shifting per the kick tables.
  function rotate(dir) {
    const { type, rotation, x, y } = piece;
    if (type === 'O') return;
    const next = (rotation + dir + 4) % 4;
    const kicks = (type === 'I' ? DEFRAG_KICKS.I : DEFRAG_KICKS.normal)[`${rotation}>${next}`];
    for (const [dx, dy] of kicks) {
      if (!collides(type, next, x + dx, y - dy)) {
        Object.assign(piece, { rotation: next, x: x + dx, y: y - dy });
        afterMove();
        audio.sfx('rotate');
        return;
      }
    }
  }

  // Where the piece would land if dropped now (the shadow at the bottom of the well)
  function dropRow() {
    let y = piece.y;
    while (!collides(piece.type, piece.rotation, piece.x, y + 1)) y++;
    return y;
  }

  function hardDrop() {
    const from = piece.y;
    const to = dropRow();
    if (to > from) {
      trail = { cells: cellsOf(piece), rows: to - from, type: piece.type, from: performance.now() };
      piece.y = to;
    }
    audio.sfx('drop');
    lockPiece(performance.now(), true);
  }

  // Swaps the falling piece for the held one (or the next one, the first time). Once per piece.
  function holdPiece() {
    if (!canHold) return;
    const current = piece.type;
    const incoming = held ?? nextFromQueue();
    held = current;
    spawn(incoming);
    canHold = false;
    audio.sfx('hold');
  }

  function lockPiece(now, dropped = false) {
    const cells = cellsOf(piece);
    cells.forEach(([x, y]) => { well[y][x] = piece.type; });
    piece = null;

    // It ended up entirely above the well: no room left
    if (cells.every(([, y]) => y < DEFRAG.hiddenRows)) {
      lose(now);
      return;
    }

    const fullRows = [];
    for (let f = 0; f < TOTAL_ROWS; f++) {
      if (well[f].every((cell) => cell !== null)) fullRows.push(f);
    }

    if (fullRows.length) {
      scoreRows(fullRows, now);
      clearing = { rows: fullRows, from: now };
      audio.sfx('rows', fullRows.length);
    } else {
      if (!dropped) audio.sfx('lock');
      nextPiece();
    }
    adjustMusic();
  }

  function scoreRows(fullRows, now) {
    const count = fullRows.length;
    const lines = [DEFRAG_ROW_NAMES[count]];
    const points = DEFRAG_ROW_POINTS * count;
    addPoints(points);
    lines.push(`+${points}`);
    rowsCleared += count;

    const center = (fullRows[0] + fullRows[fullRows.length - 1] + 1) / 2;
    floaters.push({ lines, y: center * L, from: now });

    const newLevel = Math.min(DEFRAG.maxLevel, 1 + Math.floor(rowsCleared / DEFRAG.rowsPerLevel));
    if (newLevel > level) {
      level = newLevel;
      audio.sfx('level');
      floaters.push({ lines: [`NIVEL ${level}`], y: WELL_TOP + 4 * L, from: now + 450, level: true });
    }
  }

  // Full rows go away and what is above moves down
  function removeRows(rows) {
    for (const f of rows) {
      well.splice(f, 1);
      well.unshift(Array(COLUMNS).fill(null));
    }
  }

  function addPoints(points) {
    score += points;
    emit('onScoreChange', score);
  }

  // How full the memory is: 0 (empty) to 1 (up to the topmost visible row)
  function fillLevel() {
    const firstRow = well.findIndex((row) => row.some((cell) => cell !== null));
    if (firstRow === -1) return 0;
    return Math.min(1, (TOTAL_ROWS - firstRow) / DEFRAG.rows);
  }

  // Music gets faster each level, and a bit more when memory is nearly full
  function adjustMusic() {
    const urgency = fillLevel() >= 0.75 ? 1.12 : 1;
    audio.speed((1 + 0.035 * (level - 1)) * urgency);
  }

  // Milliseconds to fall one cell, as in modern block games but with a head start (355 ms at level 1)
  function gravity() {
    const speed = level - 1 + DEFRAG.headStart;
    return Math.pow(0.8 - speed * 0.007, speed) * 1000;
  }

  function prepare() {
    well = Array.from({ length: TOTAL_ROWS }, () => Array(COLUMNS).fill(null));
    piece = null;
    queue = [];
    fillQueue();
    held = null;
    canHold = true;
    score = 0;
    rowsCleared = 0;
    level = 1;
    clearing = null;
    trail = null;
    floaters = [];
    releaseAll();
    emit('onScoreChange', 0);
  }

  function lose(now) {
    state = 'over';
    endedAt = now;
    releaseAll();
    audio.stopMusic();
    emit('playSound', 'over');
    emit('onEnd', score, false, `Nivel ${level} · ${rowsCleared} ${rowsCleared === 1 ? 'fila' : 'filas'}`);
  }

  /* ---------- Each frame: auto-repeat, fall and lock ---------- */

  function update(dt, now) {
    if (clearing) {
      if (now - clearing.from < DEFRAG.clearDuration) return;
      removeRows(clearing.rows);
      clearing = null;
      nextPiece();
      adjustMusic();
      return;
    }
    if (!piece) return;

    // Holding left or right: after a moment it auto-repeats
    if (das) {
      das.t += dt;
      const steps = das.t < DEFRAG.das ? 0 : Math.floor((das.t - DEFRAG.das) / DEFRAG.arr) + 1;
      while (das.steps < steps) {
        das.steps++;
        if (!move(das.dx)) {
          das.steps = steps;
          break;
        }
      }
    }

    // Falls by itself (twenty times faster on soft drop)
    const interval = softDrop ? gravity() / 20 : gravity();
    fallTime += dt;
    for (let drops = 0; fallTime >= interval && drops <= TOTAL_ROWS; drops++) {
      fallTime -= interval;
      if (!fall()) {
        fallTime = 0;
        break;
      }
    }

    if (onFloor()) {
      lockTime += dt;
      if (lockTime >= DEFRAG.lockDelay) lockPiece(now);
    }
  }

  function loop(now) {
    const animatingEnd = state === 'over' && now - endedAt < DEFRAG.fillDuration + 100;
    const animatingText = floaters.length > 0 && state !== 'paused';
    if (state !== 'playing' && !animatingEnd && !animatingText) {
      frame = 0;
      draw(now);
      return;
    }

    if (state === 'playing') {
      const dt = Math.min(now - lastTime, 100);   // if the tab froze, avoid huge jumps
      lastTime = now;
      if (dt > 0) update(dt, now);
    }
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function startLoop() {
    lastTime = performance.now();
    if (!frame) frame = requestAnimationFrame(loop);
  }

  /* ---------- Controls: each key or button holding an action ---------- */

  const isHeld = (action) => [...origins.values()].includes(action);

  function pressAction(origin, action) {
    if (origins.has(origin)) return;   // keys auto-repeat while down: that does not count
    const alreadyHeld = isHeld(action);
    origins.set(origin, action);
    if (alreadyHeld || state !== 'playing') return;

    if (action === 'left' || action === 'right') {
      das = { dx: action === 'left' ? -1 : 1, t: 0, steps: 0 };
      if (hasPiece()) move(das.dx);
      return;
    }
    if (action === 'down') {
      softDrop = true;
      fallTime = 0;
      if (hasPiece()) fall();
      return;
    }
    if (!hasPiece()) return;
    if (action === 'rotate') rotate(1);
    else if (action === 'rotateBack') rotate(-1);
    else if (action === 'drop') hardDrop();
    else if (action === 'hold') holdPiece();
  }

  function release(origin) {
    const action = origins.get(origin);
    if (!action) return;
    origins.delete(origin);
    if (isHeld(action)) return;

    if (action === 'down') softDrop = false;
    if (action === 'left' || action === 'right') {
      const dx = action === 'left' ? -1 : 1;
      if (das?.dx !== dx) return;
      // If the other direction is still held, it now moves that way
      das = isHeld(dx < 0 ? 'right' : 'left') ? { dx: -dx, t: 0, steps: 0 } : null;
    }
  }

  function releaseAll() {
    origins.clear();
    das = null;
    softDrop = false;
  }

  /* ---------- Drawing ---------- */

  // Rectangle in screen units; rounded to real pixels to keep the edges sharp
  function rect(x, y, width, height, color) {
    const x0 = Math.round(x * scale);
    const y0 = Math.round(y * scale);
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, Math.round((x + width) * scale) - x0, Math.round((y + height) * scale) - y0);
  }

  // A block: light edge on top and left, shadow on bottom and right, and a shine in the corner
  function block(x, y, colors, size = L) {
    rect(x, y, size, size, colors.shadow);
    rect(x, y, size - 1, 1, colors.light);
    rect(x, y, 1, size - 1, colors.light);
    rect(x + 1, y + 1, size - 2, size - 2, colors.base);
    rect(x + 1, y + 1, 1, 1, colors.shine || '#ffffff');
  }

  // The piece's shadow at the bottom: outline only
  function outline(x, y, color) {
    ctx.globalAlpha = 0.55;
    rect(x, y, L, 1, color);
    rect(x, y + L - 1, L, 1, color);
    rect(x, y + 1, 1, L - 2, color);
    rect(x + L - 1, y + 1, 1, L - 2, color);
    ctx.globalAlpha = 0.1;
    rect(x + 1, y + 1, L - 2, L - 2, color);
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, size, color, shadow = true) {
    ctx.font = `${Math.max(1, Math.round(size * scale))}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (shadow) {
      ctx.fillStyle = '#04060c';
      ctx.fillText(str, Math.round((x + 0.6) * scale), Math.round((y + 0.6) * scale));
    }
    ctx.fillStyle = color;
    ctx.fillText(str, Math.round(x * scale), Math.round(y * scale));
  }

  function box(x, y, width, height) {
    rect(x, y, width, height, '#1c2846');
    rect(x + 1, y + 1, width - 2, height - 2, '#0a1324');
  }

  // A piece in its spawn position, centered on (cx, cy)
  function centeredPiece(type, cx, cy, size, alpha = 1) {
    const cells = DEFRAG_SHAPES[type][0];
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const x0 = cx - ((Math.max(...xs) - minX + 1) * size) / 2;
    const y0 = cy - ((Math.max(...ys) - minY + 1) * size) / 2;
    ctx.globalAlpha = alpha;
    cells.forEach(([x, y]) => block(x0 + (x - minX) * size, y0 + (y - minY) * size, DEFRAG_PIECES[type].colors, size));
    ctx.globalAlpha = 1;
  }

  function drawPanels() {
    const label = '#7d8bb0';
    const value = '#7ee081';

    // Left: the held piece, level, rows and how full memory is
    text('GUARDA', LEFT_CENTER, 12, 5, label);
    box(LEFT_CENTER - 24, 19, 48, 25);
    if (held) centeredPiece(held, LEFT_CENTER, 31.5, L, canHold ? 1 : 0.35);

    text('NIVEL', LEFT_CENTER, 53, 5, label);
    text(String(level), LEFT_CENTER, 61, 7, value);
    text('FILAS', LEFT_CENTER, 77, 5, label);
    text(String(rowsCleared), LEFT_CENTER, 85, 7, value);

    const fill = state === 'over' ? 1 : fillLevel();
    const fillColor = fill < 0.5 ? '#7ee081' : fill < 0.75 ? '#ffd23f' : '#ff5c5c';
    text('MEMORIA', LEFT_CENTER, 101, 5, label);
    box(LEFT_CENTER - 22, 109, 44, 7);
    if (fill > 0) rect(LEFT_CENTER - 21, 110, 42 * fill, 5, fillColor);
    text(`${Math.round(fill * 100)}%`, LEFT_CENTER, 120, 5, fillColor);

    // Right: the next three
    text('SIGUE', RIGHT_CENTER, 12, 5, label);
    box(RIGHT_CENTER - 24, 19, 48, 67);
    queue.slice(0, 3).forEach((type, i) => {
      if (i === 0) centeredPiece(type, RIGHT_CENTER, 31.5, L);
      else centeredPiece(type, RIGHT_CENTER, 37 + i * 16.5, 5, 0.85);
    });
  }

  function drawWell(now) {
    // Frame and very soft striped columns (they help aiming)
    rect(WELL_X - 2, WELL_TOP - 2, COLUMNS * L + 4, WELL_BOTTOM - WELL_TOP + 4, '#2b3a63');
    rect(WELL_X - 1, WELL_TOP - 1, COLUMNS * L + 2, WELL_BOTTOM - WELL_TOP + 2, '#141f38');
    for (let c = 0; c < COLUMNS; c++) {
      rect(WELL_X + c * L, WELL_TOP, L, WELL_BOTTOM - WELL_TOP, c % 2 ? '#0c172b' : '#0a1324');
    }

    // The well is hidden while paused: pausing must not help you plan the move
    if (state === 'paused' || !well) return;

    // On losing, the well fills with gray from the bottom
    const grayRows = state === 'over'
      ? Math.min(TOTAL_ROWS, Math.floor((now - endedAt) / (DEFRAG.fillDuration / TOTAL_ROWS)))
      : 0;
    const isGray = (f) => f >= TOTAL_ROWS - grayRows;
    const flash = clearing && Math.floor((now - clearing.from) / 80) % 2 === 0;

    for (let f = 0; f < TOTAL_ROWS; f++) {
      const rowClearing = clearing?.rows.includes(f);
      for (let c = 0; c < COLUMNS; c++) {
        const type = well[f][c];
        const x = WELL_X + c * L;
        if (isGray(f) && (type || f >= DEFRAG.hiddenRows)) block(x, f * L, DEFRAG_FILL_COLORS);
        else if (type) block(x, f * L, rowClearing && flash ? DEFRAG_FLASH_COLORS : DEFRAG_PIECES[type].colors);
      }
    }

    // The trail of a hard-dropped piece
    if (trail) {
      const progress = (now - trail.from) / 180;
      if (progress >= 1) {
        trail = null;
      } else {
        ctx.globalAlpha = 0.35 * (1 - progress);
        const color = DEFRAG_PIECES[trail.type].colors.light;
        for (const [x, y] of trail.cells) rect(WELL_X + x * L + 1, y * L, L - 2, trail.rows * L, color);
        ctx.globalAlpha = 1;
      }
    }

    if (!piece) return;
    const colors = DEFRAG_PIECES[piece.type].colors;
    if (state === 'playing') {
      const bottom = dropRow();
      if (bottom !== piece.y) {
        for (const [x, y] of cellsOf({ ...piece, y: bottom })) outline(WELL_X + x * L, y * L, colors.base);
      }
    }
    for (const [x, y] of cellsOf(piece)) block(WELL_X + x * L, y * L, isGray(y) ? DEFRAG_FILL_COLORS : colors);
  }

  function drawFloaters(now) {
    const DURATION = 1100;
    floaters = floaters.filter((f) => now - f.from < DURATION);
    if (state === 'paused') return;
    const center = WELL_X + (COLUMNS * L) / 2;
    for (const f of floaters) {
      const progress = (now - f.from) / DURATION;
      if (progress < 0) continue;
      ctx.globalAlpha = Math.min(1, 1.6 * (1 - progress));
      let y = f.y - 4 - progress * 10 - (f.lines.length - 1) * 3.5;
      f.lines.forEach((line, i) => {
        const isMain = i === 0;
        const points = line.startsWith('+');
        const size = isMain || points ? 5 : 4;
        text(line, center, y, size, f.level ? '#7ee081' : isMain ? '#ffd23f' : points ? '#ffffff' : '#c9d2dc');
        y += size + 2;
      });
    }
    ctx.globalAlpha = 1;
  }

  function draw(now = performance.now()) {
    if (!well) return;
    rect(0, 0, DEFRAG.width, DEFRAG.height, '#0b1426');
    drawPanels();
    drawWell(now);
    drawFloaters(now);
  }

  /* ---------- What the console uses ---------- */

  // The canvas has as many pixels as the screen (also on high density screens)
  function resize() {
    const width = canvas.clientWidth;
    if (!width) return;
    const density = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * density);
    canvas.height = Math.round((width * DEFRAG.height / DEFRAG.width) * density);
    scale = canvas.width / DEFRAG.width;
    ctx.imageSmoothingEnabled = false;
    draw();
  }

  function start() {
    prepare();
    state = 'playing';
    audio.prepare();
    emit('playSound', 'start');
    audio.startMusic();
    nextPiece();
    adjustMusic();
    startLoop();
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    releaseAll();
    audio.pause();
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    audio.resume();
    startLoop();
  }

  // code: KeyboardEvent.code. Returns true if the key belongs to the game (the console then ignores it)
  function key(code, pressed) {
    const action = DEFRAG_KEYS[code];
    if (!action) return false;
    if (pressed) pressAction(code, action);
    else release(code);
    return true;
  }

  // The d-pad and buttons count while held; a swipe is a press and a release
  function press(button, pressed) {
    const action = DEFRAG_GAMEPAD[button];
    if (!action) return;
    if (pressed) pressAction(`pad:${button}`, action);
    else release(`pad:${button}`);
  }

  // Tapping the screen without swiping rotates the piece
  function tap() {
    if (hasPiece()) rotate(1);
  }

  prepare();

  return {
    get state() { return state; },
    get score() { return score; },
    start,
    pause,
    resume,
    resize,
    draw,
    key,
    press,
    tap,
    setSound: (on) => audio.setSound(on),
  };
}


/* ---------- Drawing of a piece for the start overlay (pixel-art.js format) ---------- */

function defragSprite(type) {
  const TILE = ['CCCCCS', 'CWBBBS', 'CBBBBS', 'CBBBBS', 'CBBBBS', 'SSSSSS'];
  const cells = DEFRAG_SHAPES[type][0];
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = (Math.max(...xs) - minX + 1) * 6;
  const height = (Math.max(...ys) - minY + 1) * 6;
  const grid = Array.from({ length: height }, () => Array(width).fill('.'));
  for (const [x, y] of cells) {
    TILE.forEach((row, dy) => [...row].forEach((letter, dx) => {
      grid[(y - minY) * 6 + dy][(x - minX) * 6 + dx] = letter;
    }));
  }
  const { light, base, shadow } = DEFRAG_PIECES[type].colors;
  return { palette: { C: light, B: base, S: shadow, W: '#ffffff' }, rows: grid.map((row) => row.join('')) };
}


/* ---------- The game's cartridge for the console ---------- */

const DEFRAG_CARTRIDGE = {
  id: 'defrag',
  name: 'Defrag',
  scoring: 'points',
  dailyGames: 10,
  create: (canvas, events) => createDefrag(canvas, events),
  splash: {
    text: 'Completa filas y libera la memoria',
    items: () => `<span class="overlay__item"><span class="overlay__sprite">${drawPixelArt(defragSprite('I'))}</span>50 pts</span>`,
    keyboardHelp: 'Flechas o WASD · Espacio suelta · P pausa',
    touchHelp: 'Cruceta mueve · A gira · B guarda',
  },
  controls: {
    keyboard: [
      ['Flechas o WASD', 'Mover'], ['Arriba o X', 'Girar'], ['Z', 'Girar al otro lado'], ['Abajo', 'Bajar'],
      ['Espacio', 'Soltar'], ['C o Shift', 'Guardar'], ['P', 'Pausa'], ['M', 'Sonido'],
    ],
    touch: [['Cruceta', 'Mover'], ['Arriba', 'Soltar'], ['A o tocar', 'Girar'], ['B', 'Guardar']],
  },
  end: { title: 'Memoria llena', noPoints: 'Ni un punto esta vez. ¡Otra!' },
  buttons: { a: 'Girar', b: 'Guardar' },
  endDelay: 1500,   // the well fills with gray first; an extra Space (drop) must not start another run
};
