// =============================================
// What Chocolate Doom's music player (i_oplmusic.c, midifile.c) expects to find
// and doomgeneric does not have. Included in every file when compiling (-include compat_web.h).
// =============================================

#ifndef COMPAT_WEB_H
#define COMPAT_WEB_H

#include <stddef.h>

// MIDI files store numbers the other way round from WebAssembly (big-endian)
#define SDL_SwapBE16(x) __builtin_bswap16(x)
#define SDL_SwapBE32(x) __builtin_bswap32(x)

// realloc that stops the game when out of memory (in doomgeneric_web.c)
void *I_Realloc(void *ptr, size_t size);

// Structs with no padding, as they come in the WAD (in Chocolate Doom it is in doomtype.h)
#define PACKED_STRUCT(...) struct __VA_ARGS__ __attribute__((packed))

// Which DMX sound driver version to imitate (in Chocolate Doom it is in i_sound.h)
typedef enum {
    opl_doom1_1_666,    // Doom 1 v1.666
    opl_doom2_1_666,    // Doom 2 v1.666, Hexen, Heretic
    opl_doom_1_9        // Doom v1.9 (the one in doom1.wad)
} opl_driver_ver_t;

#endif
