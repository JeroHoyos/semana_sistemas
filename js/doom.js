/* =============================================
   DOOM · WEEKLY GAME 2
   The 1993 Doom, first level only: E1M1, Hangar. Whoever reaches the exit fastest wins.

   The engine is doomgeneric (GPL-2.0) compiled to WebAssembly with a few changes (games/doom/source):
   it starts on the title screen with a minimal menu (New Game only), only E1M1 exists,
   there are no cheats, the player always runs and, on reaching the exit, it reports the level time.
   That time is Doom's own, in tics of 1/35 s: it skips pauses and does not depend
   on how fast the computer is. If you die, the level (and the clock) goes back to 0.
   The difficulty is always normal, Hurt Me Plenty, so times are comparable.
   The music is the original, played by Chocolate Doom's OPL player (as on a Sound Blaster).

   The data is shareware Doom (doom1.wad), which id Software allowed to be copied freely.
   Engine and data (about 4.5 MB) download the first time someone presses Play.

   This file gives the engine what it needs from the browser: clock, screen, keyboard, mouse,
   sound and a "disk" with doom1.wad. The console (weekly-game.js) passes it the controls
   and saves the time. To build the engine: tools/build-doom.sh
   ============================================= */

const DOOM = {
  engine: 'games/doom/doom.wasm',
  wad: 'games/doom/doom1.wad',
  engineSize: 400000,           // approximate bytes, in case the server does not send the size (loading bar)
  wadSize: 4196020,
  width: 320,                  // Doom draws at 320 × 200 and displays at 4:3, like the monitors of its day
  height: 200,
  mouseTurn: 3,                // how much Doom turns per pixel of mouse movement…
  touchTurn: 10,              // …and per pixel of finger swipe on the screen
  resultsDuration: 6000,    // ms the results screen keeps running after reaching the exit
  volume: 0.6,
};

// Doom key codes (doomkeys.h)
const DOOM_KEY = {
  up: 0xad,
  down: 0xaf,
  left: 0xac,
  right: 0xae,
  strafeLeft: 0xa0,
  strafeRight: 0xa1,
  use: 0xa2,
  fire: 0xa3,
  map: 9,
  enter: 13,
  back: 0x7f,   // Backspace: in the menu, go back
};

// In Doom's menu, fire and use also select (so A, Ctrl, Space or click all choose)
const MENU_KEY = {
  [DOOM_KEY.fire]: DOOM_KEY.enter,
  [DOOM_KEY.use]: DOOM_KEY.enter,
};

// Keyboard: the classic controls (arrows, Ctrl, Space) and the modern ones (WASD + mouse)
const DOOM_KEYBOARD = {
  ArrowUp: DOOM_KEY.up,
  KeyW: DOOM_KEY.up,
  ArrowDown: DOOM_KEY.down,
  KeyS: DOOM_KEY.down,
  ArrowLeft: DOOM_KEY.left,
  ArrowRight: DOOM_KEY.right,
  KeyA: DOOM_KEY.strafeLeft,
  Comma: DOOM_KEY.strafeLeft,
  KeyD: DOOM_KEY.strafeRight,
  Period: DOOM_KEY.strafeRight,
  ControlLeft: DOOM_KEY.fire,
  ControlRight: DOOM_KEY.fire,
  Space: DOOM_KEY.use,
  KeyE: DOOM_KEY.use,
  Tab: DOOM_KEY.map,
  Enter: DOOM_KEY.enter,
  NumpadEnter: DOOM_KEY.enter,
  Backspace: DOOM_KEY.back,
  Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55,   // weapons
};

// Console d-pad and buttons
const DOOM_GAMEPAD = {
  up: DOOM_KEY.up,
  down: DOOM_KEY.down,
  left: DOOM_KEY.left,
  right: DOOM_KEY.right,
  a: DOOM_KEY.fire,
  b: DOOM_KEY.use,
};


/* ---------- Download of engine and WAD (once per visit) ---------- */

// Downloads a file reporting received bytes, for the loading bar
async function downloadWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`);
  const total = Number(response.headers.get('content-length')) || 0;

  if (!response.body?.getReader) {
    const data = new Uint8Array(await response.arrayBuffer());
    onProgress(data.length, data.length);
    return data;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received, total);
  }

  const data = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
    data.set(chunk, position);
    position += chunk.length;
  }
  return data;
}

let doomDownload = null;

// progress: 0 to 1. If it fails, the next call tries again.
function downloadDoom(onProgress) {
  doomDownload ??= (async () => {
    const loaded = { engine: [0, DOOM.engineSize], wad: [0, DOOM.wadSize] };
    const emit = () => {
      const received = loaded.engine[0] + loaded.wad[0];
      const total = loaded.engine[1] + loaded.wad[1];
      onProgress(Math.min(1, received / total));
    };
    const [binary, wad] = await Promise.all([
      downloadWithProgress(DOOM.engine, (received, total) => {
        loaded.engine = [received, Math.max(total || DOOM.engineSize, received)];
        emit();
      }),
      downloadWithProgress(DOOM.wad, (received, total) => {
        loaded.wad = [received, Math.max(total || DOOM.wadSize, received)];
        emit();
      }),
    ]);
    return { wasmModule: await WebAssembly.compile(binary), wad };
  })().catch((error) => {
    doomDownload = null;
    throw error;
  });
  return doomDownload;
}


/* ---------- Minimal WASI: what the engine's libc asks of the "operating system" ----------
   An in-memory "disk": doom1.wad (read-only) and whatever the engine writes, which is lost
   when the page closes (the music player writes each song as /tmp/doom.mid and reads it back).
   What the engine prints goes to the browser console. */

const WASI = { EBADF: 8, EEXIST: 20, EINVAL: 28, ENOENT: 44, ENOSYS: 52, ENOTDIR: 54, EROFS: 69, ESPIPE: 70 };
const FILE_TYPE = { terminal: 2, directory: 3, normal: 4 };
const ALL_RIGHTS = 0xffffffffffffffffn;
const TERMINAL_RIGHTS = ALL_RIGHTS & ~(4n | 32n);   // without fd_seek or fd_tell: that makes libc treat it as a terminal

// The engine called exit(): almost always because of an I_Error
class DoomExit extends Error {
  constructor(code) {
    super(`Doom exited (code ${code})`);
    this.code = code;
  }
}

// files: { 'doom1.wad': Uint8Array } (read-only); memory: () => WebAssembly.Memory (grows during play)
function createWasi(initialFiles, memory) {
  const view = () => new DataView(memory().buffer);
  const bytes = () => new Uint8Array(memory().buffer);
  const decoder = new TextDecoder();
  const readText = (ptr, len) => decoder.decode(bytes().slice(ptr, ptr + len));

  const files = { ...initialFiles };                      // name → Uint8Array
  const readOnly = new Set(Object.keys(initialFiles));
  const PREOPENED = { 3: '/', 4: '.' };   // the root directory, under the two names libc may look for
  const openFiles = new Map();                // fd → { name, position } or { directory: true }
  let nextFd = 5;
  const pending = { 1: '', 2: '' };       // the current partial line of stdout and stderr
  const errors = [];                        // the last stderr lines, in case the engine dies

  // What an open file holds (empty if it was deleted while open)
  const dataOf = (opened) => files[opened.name] || new Uint8Array(0);

  // "./doom1.wad", "/doom1.wad" and "DOOM1.WAD" are the same file
  const cleanName = (path) => path.replace(/\\/g, '/').split('/').filter((part) => part && part !== '.').join('/').toLowerCase();

  function print(fd, text) {
    pending[fd] += text;
    let newline;
    while ((newline = pending[fd].indexOf('\n')) >= 0) {
      const line = pending[fd].slice(0, newline).trimEnd();
      pending[fd] = pending[fd].slice(newline + 1);
      if (!line) continue;
      if (fd === 2) {
        console.warn('[Doom]', line);
        errors.push(line);
        if (errors.length > 6) errors.shift();
      } else {
        console.debug('[Doom]', line);
      }
    }
  }

  function writeFilestat(ptr, type, size) {
    const v = view();
    for (let i = 0; i < 64; i += 8) v.setBigUint64(ptr + i, 0n, true);
    v.setUint8(ptr + 16, type);
    v.setBigUint64(ptr + 24, 1n, true);
    v.setBigUint64(ptr + 32, BigInt(size), true);
  }

  // Walks the pieces (iovec: pointer and length) of a read or write
  function* iovecs(iovs, count) {
    const v = view();
    for (let i = 0; i < count; i++) {
      yield [v.getUint32(iovs + i * 8, true), v.getUint32(iovs + i * 8 + 4, true)];
    }
  }

  const functions = {
    args_sizes_get(count, size) {
      view().setUint32(count, 0, true);
      view().setUint32(size, 0, true);
      return 0;
    },
    args_get: () => 0,
    environ_sizes_get(count, size) {
      view().setUint32(count, 0, true);
      view().setUint32(size, 0, true);
      return 0;
    },
    environ_get: () => 0,

    clock_res_get(id, result) {
      view().setBigUint64(result, 1000000n, true);
      return 0;
    },
    clock_time_get(id, precision, result) {
      const nanos = id === 0 ? BigInt(Date.now()) * 1000000n : BigInt(Math.round(performance.now() * 1e6));
      view().setBigUint64(result, nanos, true);
      return 0;
    },
    random_get(ptr, len) {
      for (let i = 0; i < len; i += 65536) {
        crypto.getRandomValues(bytes().subarray(ptr + i, ptr + Math.min(len, i + 65536)));
      }
      return 0;
    },
    sched_yield: () => 0,
    proc_exit(code) {
      throw new DoomExit(code);
    },

    fd_prestat_get(fd, result) {
      const name = PREOPENED[fd];
      if (name === undefined) return WASI.EBADF;
      view().setUint8(result, 0);
      view().setUint32(result + 4, name.length, true);
      return 0;
    },
    fd_prestat_dir_name(fd, ptr, len) {
      const name = PREOPENED[fd];
      if (name === undefined) return WASI.EBADF;
      bytes().set(new TextEncoder().encode(name).subarray(0, len), ptr);
      return 0;
    },

    fd_fdstat_get(fd, result) {
      let type;
      let rights = ALL_RIGHTS;
      if (fd <= 2) {
        type = FILE_TYPE.terminal;
        rights = TERMINAL_RIGHTS;
      } else if (PREOPENED[fd] !== undefined || openFiles.get(fd)?.directory) {
        type = FILE_TYPE.directory;
      } else if (openFiles.has(fd)) {
        type = FILE_TYPE.normal;
      } else {
        return WASI.EBADF;
      }
      const v = view();
      v.setUint8(result, type);
      v.setUint16(result + 2, 0, true);
      v.setBigUint64(result + 8, rights, true);
      v.setBigUint64(result + 16, ALL_RIGHTS, true);
      return 0;
    },
    fd_fdstat_set_flags: () => 0,

    fd_filestat_get(fd, result) {
      const opened = openFiles.get(fd);
      if (fd <= 2) writeFilestat(result, FILE_TYPE.terminal, 0);
      else if (PREOPENED[fd] !== undefined || opened?.directory) writeFilestat(result, FILE_TYPE.directory, 0);
      else if (opened) writeFilestat(result, FILE_TYPE.normal, dataOf(opened).length);
      else return WASI.EBADF;
      return 0;
    },
    path_filestat_get(fd, flags, path, pathLen, result) {
      const name = cleanName(readText(path, pathLen));
      if (!name) {
        writeFilestat(result, FILE_TYPE.directory, 0);
        return 0;
      }
      if (!files[name]) return WASI.ENOENT;
      writeFilestat(result, FILE_TYPE.normal, files[name].length);
      return 0;
    },

    // openFlags: 1 create, 2 must be a directory, 4 exclusive, 8 truncate
    path_open(fd, dirFlags, path, pathLen, openFlags, baseRights, inheritedRights, fdFlags, result) {
      const name = cleanName(readText(path, pathLen));
      let opened;
      if (!name) {
        opened = { directory: true };
      } else {
        const exists = Boolean(files[name]);
        if (exists && openFlags & 2) return WASI.ENOTDIR;
        if (exists && openFlags & 4 && openFlags & 1) return WASI.EEXIST;
        if (!exists && !(openFlags & 1)) return WASI.ENOENT;
        if (openFlags & (1 | 8)) {
          if (readOnly.has(name)) return WASI.EROFS;   // doom1.wad is never touched
          if (!exists || openFlags & 8) files[name] = new Uint8Array(0);
        }
        opened = { name, position: 0 };
      }
      const next = nextFd++;
      openFiles.set(next, opened);
      view().setUint32(result, next, true);
      return 0;
    },
    path_create_directory(fd, path, pathLen) {
      return cleanName(readText(path, pathLen)) ? 0 : WASI.EEXIST;
    },
    path_unlink_file(fd, path, pathLen) {
      const name = cleanName(readText(path, pathLen));
      if (!files[name]) return WASI.ENOENT;
      if (readOnly.has(name)) return WASI.EROFS;
      delete files[name];
      return 0;
    },
    fd_close(fd) {
      openFiles.delete(fd);
      return 0;
    },

    fd_read(fd, iovs, count, result) {
      const opened = openFiles.get(fd);
      if (!opened?.name) {
        if (fd !== 0) return WASI.EBADF;
        view().setUint32(result, 0, true);   // stdin: always empty
        return 0;
      }
      const data = dataOf(opened);
      const memBytes = bytes();
      let bytesRead = 0;
      for (const [ptr, len] of iovecs(iovs, count)) {
        const chunk = data.subarray(opened.position, opened.position + len);
        memBytes.set(chunk, ptr);
        opened.position += chunk.length;
        bytesRead += chunk.length;
        if (chunk.length < len) break;
      }
      view().setUint32(result, bytesRead, true);
      return 0;
    },
    fd_seek(fd, offset, from, result) {
      if (fd <= 2) return WASI.ESPIPE;
      const opened = openFiles.get(fd);
      if (!opened?.name) return WASI.EBADF;
      const base = from === 0 ? 0 : from === 1 ? opened.position : dataOf(opened).length;
      const target = base + Number(offset);
      if (target < 0) return WASI.EINVAL;
      opened.position = target;
      view().setBigUint64(result, BigInt(target), true);
      return 0;
    },
    fd_tell(fd, result) {
      const opened = openFiles.get(fd);
      if (!opened?.name) return fd <= 2 ? WASI.ESPIPE : WASI.EBADF;
      view().setBigUint64(result, BigInt(opened.position), true);
      return 0;
    },
    fd_write(fd, iovs, count, result) {
      const memBytes = bytes();
      let written = 0;

      // stdout and stderr: to the browser console
      if (fd === 1 || fd === 2) {
        let text = '';
        for (const [ptr, len] of iovecs(iovs, count)) {
          text += decoder.decode(memBytes.slice(ptr, ptr + len));
          written += len;
        }
        print(fd, text);
        view().setUint32(result, written, true);
        return 0;
      }

      // A file on the in-memory disk (grows if needed)
      const opened = openFiles.get(fd);
      if (!opened?.name) return WASI.EBADF;
      if (readOnly.has(opened.name)) return WASI.EROFS;
      for (const [ptr, len] of iovecs(iovs, count)) {
        let data = dataOf(opened);
        const end = opened.position + len;
        if (end > data.length) {
          const grown = new Uint8Array(end);
          grown.set(data);
          data = grown;
          files[opened.name] = data;
        }
        data.set(memBytes.subarray(ptr, ptr + len), opened.position);
        opened.position = end;
        written += len;
      }
      view().setUint32(result, written, true);
      return 0;
    },
  };

  return { functions, errors };
}

// Anything libc asks for that is not above answers "cannot do" (ENOSYS) instead of stopping the engine from starting
function fillMissingImports(wasmModule, imports) {
  for (const { module: origin, name, kind } of WebAssembly.Module.imports(wasmModule)) {
    if (kind !== 'function') continue;
    imports[origin] ??= {};
    if (imports[origin][name]) continue;
    if (origin !== 'wasi_snapshot_preview1') {
      throw new Error(`The Doom engine imports ${origin}.${name}, which the page does not provide`);
    }
    imports[origin][name] = () => WASI.ENOSYS;
  }
}

// Creates a new engine (each with its own memory) from the downloaded files
async function createDoomEngine({ wasmModule, wad }, pageImports) {
  let instance = null;
  const memory = () => instance.exports.memory;
  const wasi = createWasi({ 'doom1.wad': wad }, memory);
  const imports = { wasi_snapshot_preview1: wasi.functions, doom: pageImports };
  fillMissingImports(wasmModule, imports);

  instance = await WebAssembly.instantiate(wasmModule, imports);
  instance.exports._initialize?.();
  return { exports: instance.exports, memory, errors: wasi.errors, screen: 0 };
}


/* ---------- The run ---------- */

/* canvas: the screen's <canvas>.
   events: { onScoreChange(tics), onEnd(tics, won, detail), onStateChange(), onLoadProgress(progress),
             onError(message), requestPause() }
   Returns the run's controls. */
function createDoom(canvas, events = {}) {
  const ctx = canvas.getContext('2d');
  const emit = (name, ...data) => events[name]?.(...data);

  // Each Doom frame first goes to a 320 × 200 canvas and is then stretched to the screen
  const frame = document.createElement('canvas');
  frame.width = DOOM.width;
  frame.height = DOOM.height;
  const frameCtx = frame.getContext('2d');
  const image = frameCtx.createImageData(DOOM.width, DOOM.height);
  const pixels = new Uint32Array(image.data.buffer);

  let state = 'ready';        // 'ready' | 'loading' | 'playing' | 'paused' | 'over'
  let engine = null;            // the WebAssembly, already started
  let hasImage = false;
  let newFrame = false;
  let rafId = 0;            // requestAnimationFrame id
  let result = null;        // what the engine sent on reaching the exit
  let endedAt = 0;
  let reportedTime = -1;
  let restartPending = false;
  let soundOn = true;

  function changeState(next) {
    state = next;
    emit('onStateChange');
  }

  /* ---------- Clock: stops during pauses, so the engine does not "catch up" lost time ---------- */

  const clock = {
    accumulated: 1000,   // starts at 1000 ms: the engine takes its first reading as zero
    from: 0,
    running: false,
    ms() {
      return Math.floor(this.accumulated + (this.running ? performance.now() - this.from : 0));
    },
    start() {
      if (this.running) return;
      this.from = performance.now();
      this.running = true;
    },
    stop() {
      if (!this.running) return;
      this.accumulated += performance.now() - this.from;
      this.running = false;
    },
  };

  /* ---------- Sound effects from the WAD through Web Audio, and OPL music from the engine ---------- */

  const audio = {
    context: null,
    output: null,
    sounds: new Map(),   // lump → AudioBuffer
    channels: new Map(),   // Doom channel → what is playing on it

    // Called when pressing Play: the browser only allows sound after a click or a key press
    prepare() {
      try {
        if (!this.context) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          this.context = new AudioCtx();
          this.output = this.context.createGain();
          this.output.connect(this.context.destination);
          this.applyVolume();
        }
        this.resume();
      } catch {
        this.context = null;
      }
    },
    applyVolume() {
      if (this.output) this.output.gain.value = soundOn ? DOOM.volume : 0;
    },
    pause() {
      this.context?.suspend?.()?.catch?.(() => {});
    },
    resume() {
      if (this.context?.state === 'suspended') this.context.resume?.()?.catch?.(() => {});
    },

    // Doom sound format: 3, 0 · rate (16 bits) · sample count (32 bits) ·
    // 16 padding samples · the sound (unsigned 8 bits) · 16 padding samples
    load(lump, ptr, len) {
      if (!this.context || !engine || this.sounds.has(lump)) return;
      const data = new Uint8Array(engine.memory().buffer, ptr, len);
      if (len < 8 || data[0] !== 3 || data[1] !== 0) return;
      const rate = data[2] | (data[3] << 8);
      const count = (data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)) >>> 0;
      if (!rate || count > len - 8 || count <= 48) return;
      const samples = data.subarray(8 + 16, 8 + count - 16);

      // Some browsers reject less than 22,050 Hz: each sample is repeated (it sounds just as crunchy)
      const repeat = Math.max(1, Math.ceil(22050 / rate));
      try {
        const buffer = this.context.createBuffer(1, samples.length * repeat, rate * repeat);
        const wave = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          const value = (samples[i] - 128) / 128;
          for (let j = 0; j < repeat; j++) wave[i * repeat + j] = value;
        }
        this.sounds.set(lump, buffer);
      } catch {
        // Odd sound: it stays silent
      }
    },

    // volume: 0 to 127. separation: 0 (left) to 255 (right), 128 is center
    play(channel, lump, volume, separation) {
      const buffer = this.sounds.get(lump);
      if (!this.context || !buffer) return;
      this.stop(channel);
      try {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        const gain = this.context.createGain();
        const panner = this.context.createStereoPanner?.() || null;
        source.connect(gain);
        if (panner) {
          gain.connect(panner);
          panner.connect(this.output);
        } else {
          gain.connect(this.output);
        }

        const playing = { source, gain, panner };
        this.adjustNodes(playing, volume, separation);
        source.onended = () => {
          if (this.channels.get(channel) === playing) this.channels.delete(channel);
        };
        source.start();
        this.channels.set(channel, playing);
      } catch {
        // No Web Audio: the game goes on in silence
      }
    },
    adjustNodes({ gain, panner }, volume, separation) {
      gain.gain.value = Math.max(0, Math.min(127, volume)) / 127;
      if (panner) panner.pan.value = Math.max(-1, Math.min(1, (separation - 128) / 127));
    },
    adjust(channel, volume, separation) {
      const playing = this.channels.get(channel);
      if (playing) this.adjustNodes(playing, volume, separation);
    },
    stop(channel) {
      const playing = this.channels.get(channel);
      if (!playing) return;
      this.channels.delete(channel);
      try {
        playing.source.onended = null;
        playing.source.stop();
      } catch {
        // It had already finished
      }
    },
    playing(channel) {
      return this.channels.has(channel) ? 1 : 0;
    },

    // Music: the OPL chip emulator (inside the engine) generates the samples Web Audio asks for.
    // While audio is suspended (pause, another week) none are requested and the song stays where it was.
    music: null,
    playMusic() {
      if (!this.context || this.music || !this.context.createScriptProcessor) return;
      try {
        const node = this.context.createScriptProcessor(4096, 0, 2);
        node.onaudioprocess = (event) => {
          const left = event.outputBuffer.getChannelData(0);
          const right = event.outputBuffer.getChannelData(1);
          if (!engine) {
            left.fill(0);
            right.fill(0);
            return;
          }
          try {
            const frames = left.length;
            const ptr = engine.exports.doom_music_generate(frames);
            const data = new Int16Array(engine.memory().buffer, ptr, frames * 2);
            for (let i = 0; i < frames; i++) {
              left[i] = data[i * 2] / 32768;
              right[i] = data[i * 2 + 1] / 32768;
            }
          } catch (error) {
            left.fill(0);
            right.fill(0);
            const brokenEngine = engine;
            setTimeout(() => { if (engine === brokenEngine) fail(error); });
          }
        };
        node.connect(this.output);
        this.music = node;
      } catch {
        // No music: the game goes on with the effects
      }
    },
  };

  // What the engine asks of the page (import "doom" in doomgeneric_web.c)
  const pageImports = {
    clock_ms: () => clock.ms(),
    sleep: (ms) => { clock.accumulated += ms; },   // the engine waits for the next tic: the clock moves ahead
    frame_ready: () => { newFrame = true; },
    level_completed: (tics, kills, totalKills, items, totalItems, secrets, totalSecrets) => {
      result = { tics, kills, totalKills, items, totalItems, secrets, totalSecrets };
    },
    sound_load: (lump, ptr, len) => audio.load(lump, ptr, len),
    sound_play: (channel, lump, volume, separation) => audio.play(channel, lump, volume, separation),
    sound_adjust: (channel, volume, separation) => audio.adjust(channel, volume, separation),
    sound_stop: (channel) => audio.stop(channel),
    sound_is_playing: (channel) => audio.playing(channel),
  };

  /* ---------- Keys: each physical key (or button) holding a Doom key ----------
     If two hold the same one (W and ↑), Doom only releases it when both are released. */

  const origins = new Map();   // 'KeyW', 'pad:a', 'mouse:right'… → Doom key
  const heldKeys = new Map();  // Doom key → how many origins hold it

  function hold(origin, key) {
    if (!engine || state !== 'playing' || origins.has(origin)) return;
    if (engine.exports.doom_in_menu()) {
      key = origin === 'pad:b' ? DOOM_KEY.back : MENU_KEY[key] ?? key;
    }
    origins.set(origin, key);
    const holders = heldKeys.get(key) || 0;
    heldKeys.set(key, holders + 1);
    if (holders === 0) engine.exports.doom_key(1, key);
  }

  function release(origin) {
    const key = origins.get(origin);
    if (key === undefined) return;
    origins.delete(origin);
    const holders = (heldKeys.get(key) || 1) - 1;
    if (holders > 0) {
      heldKeys.set(key, holders);
      return;
    }
    heldKeys.delete(key);
    engine?.exports.doom_key(0, key);
  }

  // On pause, end or window change nothing can stay held (the player would keep walking)
  function releaseAll() {
    for (const key of heldKeys.keys()) engine?.exports.doom_key(0, key);
    origins.clear();
    heldKeys.clear();
    mouseButtons = 0;
    engine?.exports.doom_mouse(0, 0);
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
  }

  /* ---------- Mouse: a click on the screen captures the pointer, as in PC games ----------
     Moving it turns, left click fires and right click uses. Esc releases it (and the console pauses). */

  let mouseCaptured = false;
  let usesMouse = false;        // already captured once: resuming after a pause captures it again
  let mouseButtons = 0;
  let pointerKind = 'mouse';   // touches on phones also fire mouse events: those are ignored

  function captureMouse() {
    if (mouseCaptured || !canvas.requestPointerLock) return;
    try {
      canvas.requestPointerLock()?.catch?.(() => {});
    } catch {
      // The browser refused: play goes on with the keyboard
    }
  }

  canvas.addEventListener('pointerdown', (event) => { pointerKind = event.pointerType; });

  canvas.addEventListener('mousedown', (event) => {
    if (state !== 'playing' || pointerKind !== 'mouse') return;
    if (!mouseCaptured) {
      usesMouse = true;
      captureMouse();
      return;
    }
    event.preventDefault();
    if (event.button === 0) {
      mouseButtons |= 1;
      engine?.exports.doom_mouse(0, mouseButtons);
    } else if (event.button === 2) {
      hold('mouse:right', DOOM_KEY.use);
    }
  });

  canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0 && mouseButtons & 1) {
      mouseButtons &= ~1;
      engine?.exports.doom_mouse(0, mouseButtons);
    } else if (event.button === 2) {
      release('mouse:right');
    }
  });

  canvas.addEventListener('mousemove', (event) => {
    if (mouseCaptured) look(event.movementX, 'mouse');
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  document.addEventListener('pointerlockchange', () => {
    const wasCaptured = mouseCaptured;
    mouseCaptured = document.pointerLockElement === canvas;
    if (wasCaptured && !mouseCaptured) {
      mouseButtons = 0;
      engine?.exports.doom_mouse(0, 0);
      release('mouse:right');
      if (state === 'playing') emit('requestPause');
    }
  });

  /* ---------- Loop: the engine runs at 35 tics per second and the screen paints with each tic ---------- */

  function loop(now) {
    rafId = 0;
    if (!engine) return;
    const active = state === 'playing' || (state === 'over' && now - endedAt < DOOM.resultsDuration);
    if (!active) {
      clock.stop();
      audio.pause();   // the results screen has stopped: so does the music
      return;
    }

    try {
      if (engine.exports.doom_tick()) restartPending = false;
    } catch (error) {
      fail(error);
      return;
    }

    if (newFrame) paintFrame();
    if (state === 'playing') {
      reportTime();
      if (result) finish();
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    clock.start();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    clock.stop();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function reportTime() {
    if (restartPending) return;
    const tics = engine.exports.doom_time();
    if (tics === reportedTime) return;
    reportedTime = tics;
    emit('onScoreChange', tics);
  }

  // Reached the exit: the time is the level time according to Doom itself.
  // The engine keeps running for a while so the results screen can count up.
  function finish() {
    const { tics, kills, totalKills, secrets, totalSecrets } = result;
    result = null;
    releaseAll();
    state = 'over';
    endedAt = performance.now();
    reportedTime = tics;
    emit('onScoreChange', tics);
    emit('onEnd', tics, true, `Enemigos ${kills}/${totalKills} · Secretos ${secrets}/${totalSecrets}`);
  }

  // The engine died (a Doom or browser error). The next run starts a new one.
  function fail(error) {
    console.error('Doom stopped:', error, engine?.errors);
    engine = null;
    stopLoop();
    releaseAll();
    [...audio.channels.keys()].forEach((channel) => audio.stop(channel));
    hasImage = false;
    draw();
    changeState('ready');
    emit('onError', 'Doom se detuvo por un error. Presiona Jugar para empezar otra vez.');
  }

  /* ---------- Drawing ---------- */

  // The engine's screen is 0x00RRGGBB; ImageData wants the bytes R, G, B, A
  function paintFrame() {
    newFrame = false;
    const origin = new Uint32Array(engine.memory().buffer, engine.screen, DOOM.width * DOOM.height);
    for (let i = 0; i < origin.length; i++) {
      const p = origin[i];
      pixels[i] = 0xff000000 | ((p & 0xff) << 16) | (p & 0xff00) | ((p >>> 16) & 0xff);
    }
    frameCtx.putImageData(image, 0, 0);
    hasImage = true;
    draw();
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    if (hasImage) {
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ---------- What the console uses ---------- */

  // The canvas has as many pixels as the screen (also on high density screens)
  function resize() {
    const width = canvas.clientWidth;
    if (!width) return;
    const density = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * density);
    canvas.height = Math.round((width * 3 / 4) * density);
    draw();
  }

  function start() {
    if (state === 'loading') return;
    audio.prepare();
    if (engine) {
      restartRun();
    } else {
      loadAndStart();
    }
  }

  // First time: download, start the engine and show its title screen
  async function loadAndStart() {
    changeState('loading');
    emit('onLoadProgress', 0);
    try {
      const files = await downloadDoom((progress) => emit('onLoadProgress', progress));
      engine = await createDoomEngine(files, pageImports);
      engine.exports.doom_set_sample_rate(audio.context?.sampleRate || 44100);
      clock.start();
      engine.exports.doom_start();
      engine.screen = engine.exports.doom_screen();
      audio.playMusic();
    } catch (error) {
      console.error('Could not start Doom:', error, engine?.errors);
      engine = null;
      clock.stop();
      changeState('ready');
      emit('onError', 'No se pudo cargar Doom. Revisa la conexión e inténtalo otra vez.');
      return;
    }
    result = null;
    reportedTime = -1;
    emit('onScoreChange', 0);
    state = 'playing';
    startLoop();
    emit('onStateChange');   // if the person went elsewhere while it loaded, the console pauses it
  }

  // E1M1 again from scratch, with the level clock at 0
  function restartRun() {
    releaseAll();
    engine.exports.doom_restart();
    result = null;
    restartPending = true;
    reportedTime = -1;
    emit('onScoreChange', 0);
    state = 'playing';
    if (usesMouse) captureMouse();
    startLoop();
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    releaseAll();
    stopLoop();
    audio.pause();
  }

  // The console changed week: everything still and silent (if it was playing, it stays paused).
  // Also cuts the results screen if it was still running.
  function halt() {
    if (state === 'playing') state = 'paused';
    releaseAll();
    stopLoop();
    audio.pause();
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    audio.resume();
    if (usesMouse) captureMouse();
    startLoop();
  }

  // code: KeyboardEvent.code. Returns true if the key belongs to Doom (the console then ignores it)
  function key(code, pressed) {
    const doomKey = DOOM_KEYBOARD[code];
    if (doomKey === undefined) return false;
    if (pressed) hold(code, doomKey);
    else release(code);
    return true;
  }

  // button: 'up', 'down', 'left', 'right', 'a' or 'b'. Counts while held.
  function press(button, pressed) {
    const doomKey = DOOM_GAMEPAD[button];
    if (doomKey === undefined) return;
    if (pressed) hold(`pad:${button}`, doomKey);
    else release(`pad:${button}`);
  }

  // dx in pixels: the captured mouse or the finger swiping on the screen
  function look(dx, type) {
    if (!engine || state !== 'playing' || !dx) return;
    const turn = Math.round(dx * (type === 'touch' ? DOOM.touchTurn : DOOM.mouseTurn));
    if (turn) engine.exports.doom_mouse(turn, mouseButtons);
  }

  function setSound(on) {
    soundOn = on;
    audio.applyVolume();
  }

  return {
    get state() { return state; },
    get score() { return Math.max(0, reportedTime); },
    start,
    pause,
    resume,
    halt,
    resize,
    draw,
    key,
    press,
    look,
    setSound,
  };
}


/* ---------- The game's cartridge for the console ---------- */

const DOOM_CARTRIDGE = {
  id: 'doom',
  name: 'Doom',
  scoring: 'time',
  create: (canvas, events) => createDoom(canvas, events),
  splash: {
    text: 'E1M1 · Hangar, en Hurt Me Plenty. Llega a la salida lo más rápido que puedas. Si mueres, el reloj vuelve a 0.',
    keyboardHelp: 'Flechas o WASD + mouse · Ctrl o clic dispara · Espacio abre · 1-7 armas · P pausa',
    touchHelp: 'Cruceta camina · desliza la pantalla para girar · A dispara · B abre',
  },
  end: { title: 'Nivel completado', success: true },
  buttons: { a: 'Disparar', b: 'Abrir' },
  dpad: 'diagonal',
  endDelay: 2500,   // at the exit you press Space: an extra tap must not start another run
};
