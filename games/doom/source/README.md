# Doom for the Scare Meter console

The game of week 2 is the 1993 Doom, first level only (E1M1, *Hangar*), on *Ultra-Violence* (one above the normal difficulty). Reaching the exit gives points for the enemies killed, the items picked up, the secrets found and the time (`doomScore` in `js/doom.js`).

## What is here

| File | What it is |
| --- | --- |
| `../doom1.wad` | The shareware Doom 1.9 data (MD5 `f0cefca49926d00903cf57551d901abe`). id Software allowed the shareware version to be copied and distributed freely, unmodified. |
| `../doom.wasm` | The compiled engine. Generated with `tools/build-doom.sh` and kept in the repository (Vercel only serves files, it does not compile). |
| `doomgeneric-web.patch` | The engine changes, all behind `DOOM_WEB` (see below). |
| `doomgeneric_web.c` | The platform layer for the browser: `js/doom.js` provides clock, screen, keys, mouse and sound. |
| `opl_web.c` | The music: plays the emulated OPL chip when the page asks for samples (replaces Chocolate Doom's `opl.c` and `opl_sdl.c`, which use threads and SDL). |
| `compat_web.h` | The little that Chocolate Doom's music player expects and doomgeneric does not have. |

## Engine changes

The engine is [doomgeneric](https://github.com/ozkl/doomgeneric) (based on Chocolate Doom), at commit `e257a09`. The patch:

- Starts on the title screen (no demos, they would load other levels) with a minimal menu: only *New Game*, at the bottom, which starts E1M1 on *Ultra-Violence*. During a run the menu does not open and its shortcuts (save, load, quit…) do not work.
- Does not let another level load: `G_InitNew` and `G_DoLoadLevel` always use episode 1, map 1, and after the results screen it does not go on to E1M2.
- Removes the cheats (`iddqd`, `idclip`, `idclev`…).
- Makes the player always run, the same for everyone and also on phones.
- On reaching the exit it calls `DG_LevelCompleted` with the kills, items and secrets (each with its total) and the level time (`leveltime`, in tics of 1/35 of a second). It is the same time Doom shows on the results screen: it skips pauses and does not depend on the computer's speed. If you die, the level and the time start over.
- Removes the "melt" between screens, because it is a loop that does not give control back to the browser.
- Uses the OPL music from [Chocolate Doom](https://github.com/chocolate-doom/chocolate-doom) 3.0.1 (`i_oplmusic.c`, `midifile.c` and the Nuked OPL3 emulator): it sounds like a 1993 Sound Blaster, with the instruments in the WAD itself.

## Building

It needs git and [Zig](https://ziglang.org), tested with 0.17. Zig brings clang and the WASI libc, so Emscripten is not needed:

```bash
winget install -e --id zig.zig   # Windows (or: brew install zig)
bash tools/build-doom.sh         # from the project root, in Git Bash
```

The script downloads doomgeneric and Chocolate Doom at the exact versions tested, applies the patch, gathers the files, compiles to `wasm32-wasi` and leaves the result in `games/doom/doom.wasm`. That file must then be committed.

## Licenses

Doom (the code), doomgeneric and Chocolate Doom are free software under the [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html); the Nuked OPL3 emulator is LGPL-2.1. `doom.wasm` is a derivative work and its complete source code is that of those versions of doomgeneric and Chocolate Doom plus the files in this folder. The data in `doom1.wad` belongs to id Software and is distributed under the shareware license.
