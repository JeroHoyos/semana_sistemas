/* =============================================
   WEEKLY GAME (the Scare Meter's retro console)
   The console does not know what the game is about: it provides the screen, the controls (keyboard,
   d-pad, buttons and swiping), the sound, and saves the result in Supabase at the end.

   Each week has its game (WEEKS, below) and it changes with the buttons on the top sign.
   A locked week does not open yet: only supervisors (admins) can play it, to test it.

   Each game brings its cartridge (SNAKE_CARTRIDGE in snake.js, DOOM_CARTRIDGE in doom.js, DEFRAG_CARTRIDGE in defrag.js):
     id                     how it is saved in Supabase
     scoring                'points' (highest wins)
     dailyGames             runs per person per day (the same number goes in registrar_puntaje_juego)
     create(canvas, events) builds the run
     splash                 text, items and help of the start overlay
     controls               { keyboard, touch }: lists of [keys, what they do] shown on the pause overlay
     end                    title of the end overlay (success: true paints it as a triumph);
                            lost, optional: { title, status } when the run ends with won = false (Doom: dying)
     buttons                optional, { a, b }: A and B are game buttons while playing (without it, B does not show)
     dpad                   optional, 'diagonal': lets two directions be held at once
     endDelay               optional: ms before another run can start (and before the end overlay shows)

   The run returned by create(): state ('ready' | 'loading' | 'playing' | 'paused' | 'over'), score,
   start(), pause(), resume(), resize(), draw(), key(code, pressed) → whether it used it,
   press(button, pressed) and, if it needs them, halt(), look(dx, kind), tap() and setSound(on).

   Supabase: table puntajes_juego and functions registrar_puntaje_juego and ranking_juego
   (supabase/weekly-game.sql). The console needs a session: without one, js/auth.js hides the page.
   ============================================= */

// The weeks, in order. locked: does not open yet and only supervisors see it.
// To open a week: remove locked here and remove its game from juego_bloqueado() in the SQL.
// Doom opens by itself at 7 a.m. on 2026-11-09 (the same time is in juego_bloqueado); a page opened
// before then keeps it locked until it reloads.
// endsAt: when the week's game closes (the same time as juego_terminado() in the SQL). After it the
// screen shows the top 3 and nobody plays, not even supervisors.
const WEEKS = [
  { ...SNAKE_CARTRIDGE, week: 1, endsAt: WEEK_1_ENDS },
  { ...DOOM_CARTRIDGE, week: 2, locked: Date.now() < Date.parse('2026-11-09T07:00:00-05:00') },
  { ...DEFRAG_CARTRIDGE, week: 3, locked: true },
];

const gameConsole = $('#console');
const consoleScreen = $('#console-screen');
const consoleCanvas = $('#console-canvas');
const RECORDS_LIMIT = 10;
// These localStorage keys already hold players' data: keep them as they are
const WEEK_KEY = 'juego_semana_elegida';

let cartridge = null;           // the cartridge of the week on display
let run = null;                 // its run
const runs = new Map();         // week → run (built the first time that week opens)
const canvases = new Map();     // week → its <canvas>

// Best result of the logged-in account (from Supabase), for the game on display
let onlineRecord = 0;
// Results made without a session, per game: saved as soon as the person logs in
const pending = new Map();


/* ---------- Small helpers ---------- */

// How each kind of result is shown and compared
const SCORINGS = {
  // More points is better. On screen they have four digits, as on arcade machines (120 → "0120").
  points: {
    hud: 'PTS',
    name: 'puntaje',
    screen: (n) => String(Math.max(0, n)).padStart(4, '0'),
    text: (n) => `${n} pts`,
    table: (n) => String(n),
    improves: (next, previous) => next > (previous || 0),
    noRecord: 'Todavía no tienes puntaje. Juega una partida para entrar a la tabla.',
  },
};
const scoringOf = (game) => SCORINGS[game.scoring] || SCORINGS.points;
let scoring = SCORINGS.points;   // that of the game on display
const screenRecord = (value) => scoring.screen(value || 0);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const localRecordKey = (game = cartridge) => `juego_semana_record_${game.id}`;
const endDelay = () => cartridge.endDelay ?? 900;

// localStorage can fail (private window, blocked site): it must never break the game
function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // No storage: nothing happens
  }
}


/* ---------- Who can open each week ---------- */

const canPlay = (game) => !game.locked || isCurrentSupervisor();
// A finished week still opens, to see its final table, but no run starts
const weekOver = (game = cartridge) => Date.now() >= (game.endsAt ?? Infinity);
// The one shown on entering: the last open week
const defaultWeek = () => [...WEEKS].reverse().find((game) => !game.locked) || WEEKS[0];


/* ---------- Games per day ----------
   A game counts when it starts, so reloading the page does not give it back. This count lives in the
   browser and only decides whether a game can start; what stops extra results is registrar_puntaje_juego,
   whose answers bring this count up to date. Supervisors have no limit: they test the games. */

const gamesKey = (game) => `juego_semana_games_${game.id}_${currentUser?.id}`;

function gamesToday(game = cartridge) {
  const saved = readLocal(gamesKey(game), null);
  return saved?.day === colombiaDay() ? saved.games : 0;
}

function setGamesToday(game, games) {
  saveLocal(gamesKey(game), { day: colombiaDay(), games });
  if (game === cartridge) renderGames();
}

const outOfGames = () => !isCurrentSupervisor() && gamesToday() >= cartridge.dailyGames;

function renderGames() {
  const total = cartridge.dailyGames;
  const left = total - gamesToday();
  let text = '';
  if (outOfGames()) text = `Ya jugaste tus ${total} partidas de hoy. Vuelve mañana.`;
  else if (!isCurrentSupervisor()) text = `Te ${left === 1 ? 'queda' : 'quedan'} ${left} de ${total} partidas hoy`;
  $$('.overlay__games').forEach((line) => { line.textContent = text; });
  gameConsole.toggleAttribute('data-no-games', outOfGames());
}


/* ---------- Sound: 8-bit beeps with Web Audio ---------- */

const sound = {
  on: true,   // always starts on: it is not saved, because on phones there would be no way to turn it back on
  context: null,

  // [frequency, duration, delay, waveform]
  NOTES: {
    start: [[523, 0.07, 0], [784, 0.1, 0.08]],
    bug: [[880, 0.04, 0], [1320, 0.06, 0.04]],
    over: [[392, 0.12, 0, 'sawtooth'], [294, 0.14, 0.13, 'sawtooth'], [196, 0.32, 0.28, 'sawtooth']],
    record: [[523, 0.08, 0], [659, 0.08, 0.09], [784, 0.08, 0.18], [1047, 0.24, 0.27]],
    paused: [[440, 0.06, 0]],
    locked: [[196, 0.08, 0, 'square'], [147, 0.14, 0.09, 'square']],
  },

  play(name) {
    if (!this.on || !this.NOTES[name]) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume();
      const now = this.context.currentTime;
      for (const [frequency, duration, delay, wave = 'square'] of this.NOTES[name]) {
        const oscillator = this.context.createOscillator();
        const volume = this.context.createGain();
        oscillator.type = wave;
        oscillator.frequency.value = frequency;
        volume.gain.setValueAtTime(0.05, now + delay);
        volume.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        oscillator.connect(volume).connect(this.context.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + duration + 0.02);
      }
    } catch {
      // Browser without Web Audio: the game goes on in silence
    }
  },

  toggle() {
    this.on = !this.on;
    renderSound();
    if (this.on) this.play('paused');
  },
};

// Sound switches on and off with the M key, or with B in games that do not use it (Snake)
function renderSound() {
  $('#console-sound').textContent = sound.on ? '♪ ON' : '♪ OFF';
  runs.forEach((r) => r.setSound?.(sound.on));
}


/* ---------- The runs: one per week, each with its canvas ---------- */

// The events of a run not on display do not touch the console
// (for example, Doom finishing its load after the person changed week)
function createRun(game) {
  const canvas = canvases.size ? consoleCanvas.cloneNode(false) : consoleCanvas;
  if (canvas !== consoleCanvas) {
    canvas.removeAttribute('id');
    [...canvases.values()].at(-1).after(canvas);
  }
  canvases.set(game.week, canvas);

  let created = null;
  const active = () => created !== null && created === run;
  created = game.create(canvas, {
    onScoreChange: (value) => {
      if (active()) $('#console-score').textContent = scoring.screen(value);
    },
    onEnd: (value, won, detail) => {
      if (active()) finishRun(value, detail, won);
    },
    onStateChange: () => {
      if (!active()) {
        if (created.state === 'playing') created.pause();
        return;
      }
      renderState();
      if (run.state === 'playing' && (document.hidden || !screenInView)) pauseIfPlaying();
    },
    onLoadProgress: (progress) => {
      if (active()) renderLoad(progress);
    },
    onError: (message) => {
      setGamesToday(game, Math.max(0, gamesToday(game) - 1));   // the game failed (Doom did not load or crashed): it does not count
      if (active()) showNotice(message);
    },
    requestPause: () => {
      if (active()) pauseIfPlaying();
    },
    playSound: (name) => {
      if (active()) sound.play(name);
    },
  });

  if ('ResizeObserver' in window) new ResizeObserver(() => created.resize()).observe(canvas);
  created.setSound?.(sound.on);
  return created;
}

// What the end overlay says for each week, so they do not mix when switching between them
const savedEnds = new Map();

function saveEnd() {
  savedEnds.set(cartridge.week, {
    title: $('#end-title').textContent,
    success: $('#end-title').classList.contains('overlay__title--success'),
    score: $('#end-score').textContent,
    detail: $('#end-detail').textContent,
    status: $('#end-status').textContent,
    record: $('#end-status').classList.contains('overlay__status--record'),
    login: !$('#end-login').hidden,
  });
}

function restoreEnd() {
  const end = savedEnds.get(cartridge.week)
    || { score: scoring.screen(0), detail: '', status: '', record: false, login: false };
  if (end.title) showEndTitle(end.title, end.success);
  $('#end-score').textContent = end.score;
  $('#end-detail').textContent = end.detail;
  $('#end-detail').hidden = !end.detail;
  $('#end-status').textContent = end.status;
  $('#end-status').classList.toggle('overlay__status--record', end.record);
  $('#end-login').hidden = !end.login;
}

// Switches the console to another week. The run left behind stays paused (and can go on on returning).
function chooseWeek(game, { save = false } = {}) {
  if (!canPlay(game) || game === cartridge) return;

  if (run) {
    releaseControls();
    run.halt?.();
    if (run.state === 'playing') run.pause();
    saveEnd();
  }

  cartridge = game;
  scoring = scoringOf(game);
  if (!runs.has(game.week)) runs.set(game.week, createRun(game));
  run = runs.get(game.week);
  canvases.forEach((canvas, week) => { canvas.hidden = week !== game.week; });
  if (save) saveLocal(WEEK_KEY, game.week);

  dressConsole();
  restoreEnd();
  showNotice('');
  $('#console-score').textContent = scoring.screen(run.score ?? 0);
  onlineRecord = 0;
  renderSound();
  renderRecord();
  renderGames();
  renderState();
  renderWeeks();
  run.resize();
  loadRecords();
}

// data-state on the console decides which overlay shows on top of the screen (the CSS does it).
// In a finished week, 'finished' replaces the start and end overlays (a run that started before the close can end).
function renderState() {
  const finished = weekOver() && (run.state === 'ready' || run.state === 'over');
  gameConsole.dataset.state = finished ? 'finished' : run.state;
}

// REC: with a session, the account's record; without one, this browser's
function renderRecord() {
  const record = currentUser ? onlineRecord : readLocal(localRecordKey(), 0);
  $('#console-record').textContent = screenRecord(record);
}

function renderLoad(progress) {
  const percent = Math.max(0, Math.min(100, Math.floor(progress * 100)));
  $('#load-bar').style.width = `${percent}%`;
  $('#load-text').textContent = `${percent}%`;
}

// A notice on the start overlay (for example, if the game could not load)
function showNotice(message) {
  const notice = $('#start-notice');
  notice.textContent = message;
  notice.hidden = !message;
}

// Right after finishing you cannot start again: this way an extra tap does not skip the result
let runEndedAt = 0;

// A (or Start, Space, Enter): start, pause or go on
function mainButton() {
  if (run.state === 'loading') return;
  if (run.state === 'over' && performance.now() - runEndedAt < endDelay()) return;

  if (run.state === 'playing') {
    run.pause();
    sound.play('paused');
  } else if (run.state === 'paused') {
    run.resume();
  } else {
    if (outOfGames() || weekOver()) {
      sound.play('locked');
      renderState();   // a page opened before the close shows the final table now
      return;
    }
    setGamesToday(cartridge, gamesToday() + 1);
    showNotice('');
    run.start();
    showWholeConsole();
  }
  renderState();
}

// On starting, if the console is cut by the screen edge it scrolls to show all of it
function showWholeConsole() {
  const box = gameConsole.getBoundingClientRect();
  if (box.top < 0 || box.bottom > window.innerHeight) {
    gameConsole.scrollIntoView({ block: box.height > window.innerHeight ? 'start' : 'center', behavior: 'smooth' });
  }
  consoleScreen.focus({ preventScroll: true });
}

function pauseIfPlaying() {
  if (run.state !== 'playing') return;
  run.pause();
  releaseControls();
  renderState();
}

function showEndTitle(title, success) {
  $('#end-title').textContent = title;
  $('#end-title').classList.toggle('overlay__title--success', Boolean(success));
}

// detail: more lines for the end overlay (Doom: the points of each factor)
async function finishRun(score, detail = '', won = true) {
  const game = cartridge;
  const gameScoring = scoringOf(game);
  const lost = won ? null : game.end?.lost;
  runEndedAt = performance.now();
  releaseControls();
  renderState();
  showEndTitle(lost?.title || game.end?.title || 'Fin del juego', won && game.end?.success);
  $('#end-score').textContent = gameScoring.screen(score);
  $('#end-detail').textContent = detail;
  $('#end-detail').hidden = !detail;
  $('#end-login').hidden = true;

  if (gameScoring.improves(score, readLocal(localRecordKey(game), 0))) saveLocal(localRecordKey(game), score);
  renderRecord();

  if (score <= 0) {
    writeEnd(lost?.status || game.end?.noPoints || 'Sin puntos esta vez. ¡Otra!');
    return;
  }

  if (!currentUser) {
    if (gameScoring.improves(score, pending.get(game))) pending.set(game, score);
    writeEnd(`Inicia sesión para guardar tu ${gameScoring.name} en la tabla.`);
    $('#end-login').hidden = false;
    return;
  }

  await saveScore(score, game);
}

// If the person already changed week, the message is kept for when they come back
function writeEnd(text, highlighted = false, game = cartridge) {
  if (game !== cartridge) {
    const end = savedEnds.get(game.week);
    if (end) Object.assign(end, { status: text, record: highlighted, login: false });
    return;
  }
  const status = $('#end-status');
  status.textContent = text;
  status.classList.toggle('overlay__status--record', highlighted);
}

async function saveScore(score, game = cartridge) {
  if (isClown(currentUser?.email, currentUser?.user_metadata?.full_name)) {
    writeEnd('🤡 Tu cuenta tiene Shadowban permanente. No guarda récords.', false, game);
    return;
  }

  const gameScoring = scoringOf(game);
  writeEnd(`Guardando ${gameScoring.name}…`, false, game);
  const { data, error } = await supabaseClient.rpc('registrar_puntaje_juego', {
    p_juego: game.id,
    p_puntaje: score,
  });

  if (error) {
    console.error('Could not save the result:', error);
    const reason = String(error.message || '');
    if (reason.includes('Limite diario')) {
      setGamesToday(game, game.dailyGames);   // they played on another device: this one finds out now
      writeEnd(`Ya guardaste tus ${game.dailyGames} partidas de hoy: esta no entra a la tabla.`, false, game);
      return;
    }
    writeEnd(reason.includes('Semana bloqueada')
      ? 'Esta semana todavía está bloqueada: solo se guardan los resultados de los supervisores.'
      : reason.includes('Juego terminado')
        ? 'El juego de esta semana ya terminó: esta partida no entra a la tabla.'
        : `No se pudo guardar tu ${gameScoring.name}. Intenta otra partida en un rato.`, false, game);
    return;
  }

  if (data?.partidas_hoy > gamesToday(game)) setGamesToday(game, data.partidas_hoy);
  if (game === cartridge && data?.mejor) {
    onlineRecord = data.mejor;
    renderRecord();
  }
  if (data?.record) {
    writeEnd('¡Nuevo récord personal!', true, game);
  } else {
    writeEnd(`Tu récord sigue siendo ${gameScoring.text(data?.mejor ?? score)}.`, false, game);
  }

  // Refresh if the player entered top 10 or improved personal record
  const cached = readRecordsCache(game.id);
  const currentTop = cached?.records || [];
  const minTop10 = currentTop.length < RECORDS_LIMIT ? 0 : (currentTop[currentTop.length - 1]?.mejor_puntaje || 0);
  const entersTop10 = currentTop.length < RECORDS_LIMIT || (data?.mejor ?? score) > minTop10;

  if (entersTop10 || data?.record) {
    clearRecordsCache(game.id);
    loadRecords(true);
  } else {
    loadRecords(false);
  }
}


/* ---------- Week selector (on the top sign) ---------- */

const weeksContainer = $('#console-weeks');
const WEEK_LOCK = '<svg class="console__lock" viewBox="0 0 10 12" aria-hidden="true"><path d="M2.5 5.5V3.5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1" y="5.5" width="8" height="6.5" rx="1" fill="currentColor"/></svg>';

weeksContainer.innerHTML = WEEKS.map((game) => `
  <button class="console__week" type="button" data-week="${game.week}">
    ${game.locked ? WEEK_LOCK : ''}<span>Semana ${game.week}</span>
  </button>`).join('');

// Locked weeks only open for supervisors
function renderWeeks() {
  const admin = isCurrentSupervisor();
  $$('#console-weeks .console__week').forEach((button) => {
    const game = WEEKS.find((g) => g.week === Number(button.dataset.week));
    const closed = !canPlay(game);
    const label = closed
      ? `Semana ${game.week}: bloqueada`
      : `Semana ${game.week}${game.locked && admin ? ' (bloqueada, solo supervisores)' : ''}`;
    button.setAttribute('aria-pressed', String(game === cartridge));
    button.classList.toggle('console__week--locked', Boolean(game.locked));
    if (closed) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    button.setAttribute('aria-label', label);
    button.title = label;
  });
}

let weekNoticeUntil = 0;
function showWeekNotice(text) {
  const notice = $('#week-notice');
  notice.textContent = text;
  notice.hidden = false;
  weekNoticeUntil = performance.now() + 2600;
  setTimeout(() => {
    if (performance.now() >= weekNoticeUntil) notice.hidden = true;
  }, 2700);
}

// If a supervisor picked a week by hand, it opens again on coming back (remembered in this browser)
let weekChosenByHand = false;

weeksContainer.addEventListener('click', (event) => {
  const button = event.target.closest('.console__week');
  if (!button) return;
  const game = WEEKS.find((g) => g.week === Number(button.dataset.week));
  if (!game || game === cartridge) return;

  if (!canPlay(game)) {
    showWeekNotice('Muy pronto');
    sound.play('locked');
    return;
  }
  weekChosenByHand = true;
  chooseWeek(game, { save: true });
});

// The session changed: whoever stops being a supervisor leaves the locked week; whoever logs in as a
// supervisor goes back to the week they had chosen (if they have not started playing yet)
function checkWeeks() {
  if (!canPlay(cartridge)) {
    chooseWeek(defaultWeek());
  } else if (!weekChosenByHand && run.state === 'ready') {
    const saved = WEEKS.find((game) => game.week === readLocal(WEEK_KEY, 0));
    if (saved && canPlay(saved)) chooseWeek(saved);
  }
  renderWeeks();
}


/* ---------- Keyboard ---------- */

// While playing, each game decides what to do with its keys (and the page does not move with them).
// With no run, the console only listens if it has focus, except Space/Enter when the screen is in view
// and nothing else has focus. This way the arrows keep scrolling the page.
function onKeyDown(event) {
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if ($('dialog[open]')) return;

  const code = event.code;
  const playing = run.state === 'playing';
  const hasFocus = gameConsole.contains(document.activeElement);
  const isStart = code === 'Space' || code === 'Enter';
  const noFocus = document.activeElement === document.body || !document.activeElement;
  if (!playing && !hasFocus && !(isStart && noFocus && screenInView)) return;

  if (code === 'KeyP' || code === 'Escape') {
    if (playing) {
      event.preventDefault();
      mainButton();
    }
    return;
  }
  if (code === 'KeyM') {
    sound.toggle();
    return;
  }

  if (playing && run.key(code, true)) {
    event.preventDefault();
    return;
  }

  if (isStart) {
    if (event.target.closest?.('button')) return;   // Enter on a button already clicks that button
    if (event.repeat) return;                       // holding the key down does not start another run
    event.preventDefault();
    mainButton();
  } else if (hasFocus && code.startsWith('Arrow')) {
    event.preventDefault();   // with the console focused, the arrows do not move the page
  }
}

// Releasing a key always reaches the game, so nothing stays pressed
function onKeyUp(event) {
  if (run.key(event.code, false) && run.state === 'playing') event.preventDefault();
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);


/* ---------- D-pad ----------
   The finger (or mouse) is followed over the whole d-pad: it can slide from one arm to another without lifting.
   Each direction counts while pressed; with the 'diagonal' d-pad, two are pressed in the corners. */

const dpad = $('.dpad');
let dpadPointer = null;
let dpadPressed = new Set();

// Keep finger movements reaching the element even if it leaves it (if the browser refuses, nothing happens)
function capturePointer(element, event) {
  try {
    element.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer no longer active
  }
}

function dpadDirections(event) {
  const box = dpad.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);
  const directions = new Set();
  if (Math.hypot(dx, dy) < box.width * 0.12) return directions;   // the center presses nothing

  if (cartridge.dpad !== 'diagonal') {
    if (Math.abs(dx) > Math.abs(dy)) directions.add(dx > 0 ? 'right' : 'left');
    else directions.add(dy > 0 ? 'down' : 'up');
    return directions;
  }

  // Eight 45° sectors: 0° is right and 90° is down
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle > -67.5 && angle < 67.5) directions.add('right');
  if (angle > 22.5 && angle < 157.5) directions.add('down');
  if (angle > 112.5 || angle < -112.5) directions.add('left');
  if (angle > -157.5 && angle < -22.5) directions.add('up');
  return directions;
}

function pressDpad(next) {
  for (const direction of dpadPressed) {
    if (!next.has(direction)) run.press(direction, false);
  }
  for (const direction of next) {
    if (dpadPressed.has(direction)) continue;
    run.press(direction, true);
    konamiStep(direction);
  }
  dpadPressed = next;
  $$('.dpad__button').forEach((button) => {
    button.classList.toggle('dpad__button--pressed', next.has(button.dataset.direction));
  });
}

dpad.addEventListener('pointerdown', (event) => {
  if (dpadPointer !== null) return;
  event.preventDefault();
  dpadPointer = event.pointerId;
  capturePointer(dpad, event);
  pressDpad(dpadDirections(event));
});
dpad.addEventListener('pointermove', (event) => {
  if (event.pointerId === dpadPointer) pressDpad(dpadDirections(event));
});
function releaseDpad(event) {
  if (event.pointerId !== dpadPointer) return;
  dpadPointer = null;
  pressDpad(new Set());
}
dpad.addEventListener('pointerup', releaseDpad);
dpad.addEventListener('pointercancel', releaseDpad);
dpad.addEventListener('lostpointercapture', releaseDpad);

// With the keyboard (Tab to the d-pad and Enter) each arm is one tap
$$('.dpad__button').forEach((button) => {
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;   // detail 0 = click made with the keyboard
    run.press(button.dataset.direction, true);
    run.press(button.dataset.direction, false);
    konamiStep(button.dataset.direction);
  });
});


/* ---------- Konami code on the console's own controls ----------
   ↑ ↑ ↓ ↓ ← → ← → B A with the d-pad and the buttons (the keyboard's arrows do not count).
   js/secrets.js gives the prize. The A that completes it does not start or pause the game. */

const KONAMI = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
let konamiInputs = [];

// Returns true when this input completes the code
function konamiStep(input) {
  konamiInputs = [...konamiInputs, input].slice(-KONAMI.length);
  if (konamiInputs.join() !== KONAMI.join()) return false;
  konamiInputs = [];
  pauseIfPlaying();
  claimSecret('konami');
  return true;
}


/* ---------- A and B buttons, and Start ----------
   If the game brings buttons (Doom, Defrag), while playing A and B belong to the game and count while held.
   If not (Snake), A starts or pauses and B turns the sound on and off.
   Start always starts or pauses. */

const gameButtonReleases = [];

function connectButton(element, button, consoleAction) {
  let held = false;
  const isForGame = () => cartridge.buttons && run.state === 'playing';

  const releaseButton = () => {
    if (!held) return;
    held = false;
    run.press(button, false);
  };

  element.addEventListener('pointerdown', (event) => {
    if (!isForGame()) return;
    event.preventDefault();
    capturePointer(element, event);
    held = true;
    run.press(button, true);
  });
  element.addEventListener('pointerup', releaseButton);
  element.addEventListener('pointercancel', releaseButton);
  element.addEventListener('lostpointercapture', releaseButton);

  element.addEventListener('click', (event) => {
    if (konamiStep(button)) return;
    if (isForGame()) {
      if (event.detail === 0) {   // with the keyboard: one tap
        run.press(button, true);
        run.press(button, false);
      }
      return;
    }
    consoleAction?.();
  });

  gameButtonReleases.push(releaseButton);
}

connectButton($('#button-a'), 'a', mainButton);
connectButton($('#button-b'), 'b', () => {
  if (!cartridge.buttons) sound.toggle();
});
$('#button-start').addEventListener('click', mainButton);

// On pausing, ending or changing week the d-pad and buttons are released (the finger may stay on them)
function releaseControls() {
  if (dpadPressed.size) pressDpad(new Set());
  gameButtonReleases.forEach((release) => release());
}

// On phones, leaving a finger still on a button does not open the browser's menu
gameConsole.addEventListener('contextmenu', (event) => {
  if (event.target.closest('button, .console__screen')) event.preventDefault();
});


/* ---------- Tapping and swiping on the screen ----------
   Snake: a swipe turns. Doom (games with look): a swipe turns the view. Defrag: a swipe moves and drops the piece.
   A tap without a swipe starts or resumes the run; while playing, it tells the game if it cares (Defrag: rotates). */

let touch = null;
let touchSwiped = false;
const SWIPE_DISTANCE = 22;

consoleScreen.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  touch = { x: event.clientX, y: event.clientY };
  touchSwiped = false;
});

consoleScreen.addEventListener('pointermove', (event) => {
  if (!touch || run.state !== 'playing') return;
  const dx = event.clientX - touch.x;
  const dy = event.clientY - touch.y;

  if (run.look) {
    if (event.pointerType === 'mouse') return;   // with a mouse the game captures the pointer itself
    run.look(dx, 'touch');
    touch = { x: event.clientX, y: event.clientY };
    if (dx) touchSwiped = true;
    return;
  }

  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DISTANCE) return;
  const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  run.press(direction, true);
  run.press(direction, false);
  touch = { x: event.clientX, y: event.clientY };   // the swipe can go on without lifting the finger
  touchSwiped = true;
});

consoleScreen.addEventListener('pointerup', (event) => {
  const onButton = event.target.closest('button');
  if (touch && !touchSwiped && !onButton) {
    if (run.state === 'playing') run.tap?.();
    else mainButton();
  }
  touch = null;
});
consoleScreen.addEventListener('pointercancel', () => { touch = null; });

// It pauses by itself if the person goes to another tab, another window or scrolls down the page
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseIfPlaying();
});
window.addEventListener('blur', pauseIfPlaying);

let screenInView = false;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    screenInView = entry.intersectionRatio >= 0.5;
    if (!screenInView) pauseIfPlaying();
  }, { threshold: [0, 0.5] }).observe(consoleScreen);
}

if (!('ResizeObserver' in window)) {
  window.addEventListener('resize', () => run.resize());
}

// Snake and Defrag write with the pixel font: they redraw when it finishes loading
document.fonts?.load("10px 'Press Start 2P'").then(() => run.draw()).catch(() => {});

// Log in from the end overlay or the records table
function openLogin() {
  setAuthMode(false);
  $('#auth-modal').showModal();
}
$('#end-login').addEventListener('click', openLogin);


/* ---------- Records table (of the week on display) ---------- */

const recordsList = $('#records-list');
const myRecord = $('#records-mine');

function renderEmptyRecords(title, text) {
  recordsList.innerHTML = `
    <li class="ranking-empty records__empty">
      <div class="ranking-empty__box">
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
    </li>`;
}

// Places: on the same result, whoever played fewer games goes first (ranking_juego sorts them so);
// with the same games too, they share the place (1, 2, 2, 4…)
function placesWithTies(rows) {
  return rows.map((row) => rows.findIndex((other) => (
    other.mejor_puntaje === row.mejor_puntaje && other.partidas === row.partidas
  )) + 1);
}

function renderRecords(rows) {
  // Leave out any clown with a Shadowban
  const visible = (rows || []).filter((row) => !isClown(row.usuario, row.nombre));

  if (!visible.length) {
    renderEmptyRecords('La tabla está vacía', `Nadie ha jugado todavía. ¡Estrena la tabla!`);
    return;
  }

  const places = placesWithTies(visible);
  recordsList.innerHTML = visible.map((row, i) => (
    recordRow(row, places[i], currentUser && row.usuario_id === currentUser.id)
  )).join('');

  // The top 3 on the screen of a finished week (with ties there can be more)
  $('#finished-podium').innerHTML = visible.map((row, i) => (places[i] > 3 ? '' : `
    <li>
      <span>${PODIUM[places[i]]}</span>
      <span class="overlay__podium-name">${escapeHtml(row.nombre)}</span>
      <strong>${scoring.table(row.mejor_puntaje)}</strong>
    </li>`)).join('');
}

const PODIUM = { 1: '🥇', 2: '🥈', 3: '🥉' };

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

// One row of the table: place, monster, name, user and games, and the result
function recordRow(row, place, isMine) {
  const medal = MEDALS[place] || 'normal';
  const monster = row.monstruo || {};
  const user = row.usuario ? `@${escapeHtml(row.usuario)}` : '';
  const games = `${row.partidas} ${row.partidas === 1 ? 'partida' : 'partidas'}`;

  return `
      <li class="record record--${medal} ${isMine ? 'record--mine' : ''}">
        <span class="scarer-card__rank scarer-card__rank--${medal}">${place}</span>
        <span class="scarer-card__avatar" style="border-color: ${monsterColor(monster)}">
          ${drawCustomMonster(monster)}
        </span>
        <span class="record__info">
          <span class="record__name">${escapeHtml(row.nombre)}${isMine ? ' <small>(tú)</small>' : ''}</span>
          <span class="record__user">${user}${user ? ' · ' : ''}${games}</span>
        </span>
        <span class="record__points">${scoring.table(row.mejor_puntaje)}</span>
      </li>`;
}

function applyMyRecordState(state, game) {
  const gameScoring = scoringOf(game);
  if (!state || !state.hasScore) {
    onlineRecord = 0;
    myRecord.innerHTML = `<p>${gameScoring.noRecord}</p>`;
    renderRecord();
    return;
  }

  onlineRecord = state.row?.mejor_puntaje ?? state.mejor_puntaje ?? 0;
  renderRecord();

  if (state.inTable || recordsList.querySelector('.record--mine')) {
    myRecord.innerHTML = '';
    return;
  }

  const meta = currentUser.user_metadata || {};
  const user = handleOf(currentUser.email);
  const me = { nombre: meta.full_name || user, usuario: user, monstruo: meta.monstruo, ...state.row };
  myRecord.innerHTML = `
    <ol class="records__list">${recordRow(me, typeof state.count === 'number' ? state.count + 1 : '–', true)}</ol>`;
}

function saveMyRecordCache(gameId, myRecord) {
  try {
    const cached = readRecordsCache(gameId);
    if (cached) {
      cached.myRecord = myRecord;
      localStorage.setItem(`${RECORDS_CACHE_PREFIX}${gameId}`, JSON.stringify(cached));
    }
  } catch (_) {}
}

// Below the table: the row of whoever is logged in, with their place, if it is not in the table.
// If the person changes week during the query, nothing is painted (the other query is on its way).
async function renderMyRecord(game, force = false) {
  if (!currentUser) {
    onlineRecord = 0;
    myRecord.innerHTML = `
      <p>Puedes jugar sin cuenta, pero para entrar a la tabla necesitas tu carnet.</p>
      <button class="hero__button hero__button--session records__login" type="button">Iniciar sesión</button>`;
    myRecord.querySelector('button').addEventListener('click', openLogin);
    renderRecord();
    return;
  }

  if (!force) {
    const cached = readRecordsCache(game.id);
    if (cached && cached.myRecord !== undefined) {
      applyMyRecordState(cached.myRecord, game);
      return;
    }
  }

  const gameScoring = scoringOf(game);
  const { data: row, error } = await supabaseClient
    .from('puntajes_juego')
    .select('mejor_puntaje, partidas')
    .eq('usuario_id', currentUser.id)
    .eq('juego', game.id)
    .maybeSingle();
  if (game !== cartridge) return;

  if (error || !row || !row.mejor_puntaje) {
    const state = { hasScore: false };
    saveMyRecordCache(game.id, state);
    applyMyRecordState(state, game);
    return;
  }

  // Already in the table (highlighted there): nothing below
  if (recordsList.querySelector('.record--mine')) {
    const state = { hasScore: true, inTable: true, mejor_puntaje: row.mejor_puntaje, partidas: row.partidas };
    saveMyRecordCache(game.id, state);
    applyMyRecordState(state, game);
    return;
  }

  // Place = how many people have a better result (or the same in fewer games), plus one
  const { count } = await supabaseClient
    .from('puntajes_juego')
    .select('usuario_id', { count: 'exact', head: true })
    .eq('juego', game.id)
    .or(`mejor_puntaje.gt.${row.mejor_puntaje},and(mejor_puntaje.eq.${row.mejor_puntaje},partidas.lt.${row.partidas})`);
  if (game !== cartridge) return;

  const state = { hasScore: true, inTable: false, row, count };
  saveMyRecordCache(game.id, state);
  applyMyRecordState(state, game);
}

const RECORDS_CACHE_PREFIX = 'semana_sistemas_records_';
const RECORDS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

function readRecordsCache(gameId) {
  try {
    const raw = localStorage.getItem(`${RECORDS_CACHE_PREFIX}${gameId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.timestamp !== 'number') return null;
    if (Date.now() - data.timestamp > RECORDS_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeRecordsCache(gameId, records) {
  try {
    localStorage.setItem(`${RECORDS_CACHE_PREFIX}${gameId}`, JSON.stringify({
      timestamp: Date.now(),
      records,
    }));
  } catch (e) {
    console.warn('Could not cache game records:', e);
  }
}

function clearRecordsCache(gameId) {
  try {
    localStorage.removeItem(`${RECORDS_CACHE_PREFIX}${gameId}`);
  } catch {}
}

let recordsLoading = null;
let reloadRecords = false;

async function loadRecords(force = false) {
  if (!currentUser) {
    renderEmptyRecords('Inicia sesión', 'Inicia sesión con tu carnet para ver la tabla de récords.');
    myRecord.innerHTML = '';
    return;
  }
  const game = cartridge;

  // Use 10-minute cache if available and not forced
  if (!force) {
    const cached = readRecordsCache(game.id);
    if (cached && Array.isArray(cached.records)) {
      renderRecords(cached.records);
      await renderMyRecord(game, false);
      return;
    }
  }

  // If a notice arrives during the query (real time, save, session, week change), it queries again when done
  if (recordsLoading) {
    reloadRecords = true;
    return recordsLoading;
  }

  recordsLoading = (async () => {
    try {
      const { data, error } = await supabaseClient.rpc('ranking_juego', {
        p_juego: game.id,
        p_limite: RECORDS_LIMIT,
      });
      if (game !== cartridge) {
        reloadRecords = true;
        return;
      }
      if (error) {
        console.error('Could not load the records:', error);
        renderEmptyRecords('Tabla sin conexión', 'No se pudieron cargar los récords. El juego funciona igual: inténtalo más tarde.');
        myRecord.innerHTML = '';
        return;
      }
      const records = data || [];
      writeRecordsCache(game.id, records);
      renderRecords(records);
      await renderMyRecord(game, true);
    } finally {
      recordsLoading = null;
      if (reloadRecords) {
        reloadRecords = false;
        loadRecords(true);
      }
    }
  })();
  return recordsLoading;
}

// Real-time updates for game records (refreshes if score qualifies for top 10 or cache expired)
let gameRealtimeChannel = null;

function setupGameRealtime() {
  if (gameRealtimeChannel || !currentUser) return;
  try {
    gameRealtimeChannel = supabaseClient
      .channel('game-score-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puntajes_juego' }, (payload) => {
        const gameId = cartridge?.id;
        if (!gameId) return;
        if (payload?.new?.juego && payload.new.juego !== gameId) return;

        const newScore = Number(payload?.new?.mejor_puntaje) || 0;
        const cached = readRecordsCache(gameId);
        const records = cached?.records || [];
        const minTop10 = records.length < RECORDS_LIMIT ? 0 : (records[records.length - 1]?.mejor_puntaje || 0);

        // Only query Supabase if score enters top 10 or cache is missing/expired
        if (!cached || records.length < RECORDS_LIMIT || newScore > minTop10) {
          clearRecordsCache(gameId);
          loadRecords(true);
        }
      })
      .subscribe();
  } catch {
    console.log('Real time is not available for the records table');
  }
}

function teardownGameRealtime() {
  if (gameRealtimeChannel) {
    try {
      supabaseClient.removeChannel(gameRealtimeChannel);
    } catch {}
    gameRealtimeChannel = null;
  }
}

// The session (or its titles) changed: check which weeks it can open, repaint the table
// (to mark "tú") and, if there were unsaved results, save them
document.addEventListener('idcard:session', async () => {
  checkWeeks();
  renderGames();
  if (currentUser) {
    setupGameRealtime();
    if (pending.size) {
      const toSave = [...pending];
      pending.clear();
      $('#end-login').hidden = true;
      for (const [game, value] of toSave) {
        if (canPlay(game)) await saveScore(value, game);
      }
    } else {
      loadRecords();
    }
  } else {
    teardownGameRealtime();
    renderEmptyRecords('Inicia sesión', 'Inicia sesión con tu carnet para ver la tabla de récords.');
    myRecord.innerHTML = '';
  }
});

if (currentUser) {
  setupGameRealtime();
}


/* ---------- The console dresses up with the game's cartridge ---------- */

function dressConsole() {
  const { splash = {}, end = {}, buttons, controls = {} } = cartridge;

  gameConsole.dataset.game = cartridge.id;
  gameConsole.style.setProperty('--end-delay', `${endDelay()}ms`);

  // Start overlay
  $('#start-text').textContent = splash.text || '';
  $('#start-items').innerHTML = typeof splash.items === 'function' ? splash.items() : splash.items || '';
  $('#keyboard-help').textContent = splash.keyboardHelp || '';
  $('#touch-help').textContent = splash.touchHelp || '';

  // Pause overlay: the full list of controls
  const controlRows = (rows = []) => rows.map(([keys, action]) => `<dt>${keys}</dt><dd>${action}</dd>`).join('');
  $('#pause-keyboard').innerHTML = controlRows(controls.keyboard);
  $('#pause-touch').innerHTML = controlRows(controls.touch);

  // Score and end overlay
  $('#hud-label').textContent = scoring.hud;
  $('#end-title').textContent = end.title || 'Fin del juego';
  $('#end-title').classList.toggle('overlay__title--success', Boolean(end.success));
  $('#end-label').textContent = capitalize(scoring.name);

  // A and B: if they belong to the game they are named after what they do; if not, A is Jugar and B is Sonido
  $('#button-a-label').textContent = buttons?.a || 'Jugar';
  $('#button-a').setAttribute('aria-label', buttons ? `A: ${buttons.a.toLowerCase()}` : 'A: jugar o pausar');
  $('#button-b-label').textContent = buttons?.b || 'Sonido';
  $('#button-b').setAttribute('aria-label', buttons ? `B: ${buttons.b.toLowerCase()}` : 'B: sonido');
}


/* ---------- Startup: the week the person had chosen (if they can open it) or the last open one ---------- */

const savedWeek = WEEKS.find((game) => game.week === readLocal(WEEK_KEY, 0));
chooseWeek(savedWeek && canPlay(savedWeek) ? savedWeek : defaultWeek());
