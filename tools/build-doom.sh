#!/usr/bin/env bash
# =============================================
# BUILDS DOOM FOR THE SCARE METER CONSOLE
# Generates games/doom/doom.wasm from:
#   - doomgeneric (GPL-2.0) with the web patch in games/doom/source: only E1M1 on Ultra-Violence,
#     minimal menu (New Game only), no cheats, a notification on finishing the level
#   - Chocolate Doom's music (GPL-2.0): the OPL player (i_oplmusic.c, midifile.c)
#     and the Nuked OPL3 chip emulator (opl3.c, LGPL-2.1)
#   - the browser layer: doomgeneric_web.c and opl_web.c
#
# Needs git and Zig (tested with 0.17; it brings clang and the WASI libc, Emscripten is not needed):
#   Windows:  winget install -e --id zig.zig
#   macOS:    brew install zig
#   Linux:    https://ziglang.org/download
#
# Usage (on Windows, from Git Bash):  bash tools/build-doom.sh
# If zig is not on the PATH:          ZIG=/path/to/zig bash tools/build-doom.sh
# =============================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/games/doom/source"
OUTPUT="$ROOT/games/doom/doom.wasm"
WORK="${TMPDIR:-/tmp}/doomgeneric-web"

# The exact versions everything was tested with
DOOMGENERIC_REPO="https://github.com/ozkl/doomgeneric.git"
DOOMGENERIC_COMMIT="e257a09527062bfb986b6e5e0780839b6cbd5b71"
CHOCOLATE_REPO="https://github.com/chocolate-doom/chocolate-doom.git"
CHOCOLATE_VERSION="chocolate-doom-3.0.1"
CHOCOLATE_COMMIT="539ef367c9982c5945f8608b63d2236eaecc929a"

ZIG="${ZIG:-zig}"
if ! command -v "$ZIG" >/dev/null 2>&1; then
  echo "zig not found. Install it (for example: winget install -e --id zig.zig) and run this script again." >&2
  exit 1
fi
echo "[Doom] Zig $("$ZIG" version)"

# 1. Clean copies, without converting line endings (otherwise the patch does not apply)
rm -rf "$WORK"
mkdir -p "$WORK"
git -c core.autocrlf=false clone --quiet "$DOOMGENERIC_REPO" "$WORK/doomgeneric-repo"
git -C "$WORK/doomgeneric-repo" -c advice.detachedHead=false checkout --quiet "$DOOMGENERIC_COMMIT"
git -C "$WORK/doomgeneric-repo" apply "$SOURCE/doomgeneric-web.patch"
echo "[Doom] doomgeneric ${DOOMGENERIC_COMMIT:0:7} with the web patch"

git -c core.autocrlf=false -c advice.detachedHead=false clone --quiet --depth 1 --branch "$CHOCOLATE_VERSION" \
  "$CHOCOLATE_REPO" "$WORK/chocolate-doom"
if [ "$(git -C "$WORK/chocolate-doom" rev-parse HEAD)" != "$CHOCOLATE_COMMIT" ]; then
  echo "Chocolate Doom version $CHOCOLATE_VERSION is not the expected commit ($CHOCOLATE_COMMIT)." >&2
  exit 1
fi
echo "[Doom] Chocolate Doom ${CHOCOLATE_VERSION#chocolate-doom-} (OPL music)"

# 2. Everything in one folder: doomgeneric, Chocolate Doom's music and the web layer
FOLDER="$WORK/doomgeneric-repo/doomgeneric"
for file in src/i_oplmusic.c src/midifile.c src/midifile.h \
            opl/opl.h opl/opl3.c opl/opl3.h opl/opl_queue.c opl/opl_queue.h; do
  cp "$WORK/chocolate-doom/$file" "$FOLDER/"
done
cp "$SOURCE/doomgeneric_web.c" "$SOURCE/opl_web.c" "$SOURCE/compat_web.h" "$FOLDER/"

# The same files as doomgeneric's Makefile (without SDL), the music and the web layer
FILES=(
  dummy.c am_map.c doomdef.c doomstat.c dstrings.c d_event.c d_items.c d_iwad.c d_loop.c
  d_main.c d_mode.c d_net.c f_finale.c f_wipe.c g_game.c hu_lib.c hu_stuff.c info.c
  i_cdmus.c i_endoom.c i_joystick.c i_scale.c i_sound.c i_system.c i_timer.c memio.c
  m_argv.c m_bbox.c m_cheat.c m_config.c m_controls.c m_fixed.c m_menu.c m_misc.c
  m_random.c p_ceilng.c p_doors.c p_enemy.c p_floor.c p_inter.c p_lights.c p_map.c
  p_maputl.c p_mobj.c p_plats.c p_pspr.c p_saveg.c p_setup.c p_sight.c p_spec.c
  p_switch.c p_telept.c p_tick.c p_user.c r_bsp.c r_data.c r_draw.c r_main.c r_plane.c
  r_segs.c r_sky.c r_things.c sha1.c sounds.c statdump.c st_lib.c st_stuff.c s_sound.c
  tables.c v_video.c wi_stuff.c w_checksum.c w_file.c w_main.c w_wad.c z_zone.c
  w_file_stdc.c i_input.c i_video.c doomgeneric.c mus2mid.c
  i_oplmusic.c midifile.c opl3.c opl_queue.c
  doomgeneric_web.c opl_web.c
)

# 3. A WebAssembly "reactor": it has no main; the page calls doom_start and then doom_tick on each frame.
#    -fno-sanitize: Doom does math that technically overflows in C; that must not stop the game.
#    -g0 -s: no debug information (with it the file weighs several times more).
cd "$FOLDER"
"$ZIG" cc \
  -target wasm32-wasi \
  -mexec-model=reactor \
  -O2 \
  -g0 \
  -s \
  -fno-sanitize=undefined \
  -fwrapv \
  -fno-strict-aliasing \
  -DDOOM_WEB \
  -DFEATURE_SOUND \
  -DDOOMGENERIC_RESX=320 \
  -DDOOMGENERIC_RESY=200 \
  -include compat_web.h \
  -Wno-implicit-function-declaration \
  -Wno-int-conversion \
  -Wno-incompatible-pointer-types \
  -Wno-incompatible-function-pointer-types \
  -Wno-pointer-sign \
  -Wno-unused-value \
  -Wno-unused-variable \
  -Wno-absolute-value \
  -Wl,-z,stack-size=1048576 \
  -o doom.wasm \
  "${FILES[@]}"

cp doom.wasm "$OUTPUT"
echo "[Doom] Done: games/doom/doom.wasm ($(wc -c < "$OUTPUT") bytes)"
