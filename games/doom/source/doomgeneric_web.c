// =============================================
// DOOM ON THE SCARE METER CONSOLE (WebAssembly)
//
// doomgeneric's platform layer for the browser. The page (js/doom.js) provides the clock,
// the screen, the keyboard, the mouse and the sound; this file starts the engine on the title
// screen with its menu and passes it what arrives from the page.
//
// What changed in the engine is in doomgeneric-web.patch (all behind DOOM_WEB):
// only E1M1 on Ultra-Violence exists, the menu is New Game only, there are no cheats, the player
// always runs and on reaching the exit it calls DG_LevelCompleted with the level results.
// The music is played by Chocolate Doom's OPL player (i_oplmusic.c) with opl_web.c.
//
// Doom, doomgeneric and Chocolate Doom are free software under the GPL-2.0 (see README.md).
// =============================================

#include <stdint.h>
#include <stdlib.h>

#include "doomgeneric.h"
#include "doomkeys.h"
#include "doomstat.h"
#include "doomtype.h"
#include "d_event.h"
#include "deh_str.h"
#include "g_game.h"
#include "i_sound.h"
#include "i_system.h"
#include "i_timer.h"
#include "m_menu.h"
#include "m_misc.h"
#include "w_wad.h"
#include "z_zone.h"

#define EXPORT(name) __attribute__((export_name(name)))
#define FROM_PAGE(name) __attribute__((import_module("doom"), import_name(name)))

void M_ClearMenus(void);   // it is in m_menu.c, but not in its header

// Fixed difficulty so scores are comparable: Ultra-Violence, one above Doom's normal (Hurt Me Plenty)
#define DIFFICULTY sk_hard


/* ---------- What the page provides (js/doom.js) ---------- */

FROM_PAGE("clock_ms") uint32_t js_clock_ms(void);
FROM_PAGE("sleep") void js_sleep(uint32_t ms);
FROM_PAGE("frame_ready") void js_frame_ready(void);
FROM_PAGE("level_completed") void js_level_completed(int tics, int kills, int total_kills,
                                                     int items, int total_items,
                                                     int secrets, int total_secrets);
FROM_PAGE("sound_load") void js_sound_load(int lump, const void *data, int length);
FROM_PAGE("sound_play") void js_sound_play(int channel, int lump, int volume, int separation);
FROM_PAGE("sound_adjust") void js_sound_adjust(int channel, int volume, int separation);
FROM_PAGE("sound_stop") void js_sound_stop(int channel);
FROM_PAGE("sound_is_playing") int js_sound_is_playing(int channel);


/* ---------- Functions doomgeneric asks of each platform ---------- */

void DG_Init(void)
{
}

// The frame is in DG_ScreenBuffer (320 × 200, 0x00RRGGBB): the page paints it on the canvas
void DG_DrawFrame(void)
{
    js_frame_ready();
}

// The browser cannot sleep (the page sets the pace with requestAnimationFrame).
// When the engine waits for the next tic, "sleep" moves the page's clock ahead: this way it does not
// keep spinning and wasting the processor.
void DG_SleepMs(uint32_t ms)
{
    js_sleep(ms);
}

// The page's clock stops while the console is paused
uint32_t DG_GetTicksMs(void)
{
    return js_clock_ms();
}

// Keys are not requested: they arrive through doom_key
int DG_GetKey(int *pressed, unsigned char *key)
{
    (void) pressed;
    (void) key;
    return 0;
}

void DG_SetWindowTitle(const char *title)
{
    (void) title;
}

// G_DoCompleted (g_game.c) calls it on reaching the exit of E1M1
void DG_LevelCompleted(int tics, int kills, int total_kills, int items,
                       int total_items, int secrets, int total_secrets)
{
    js_level_completed(tics, kills, total_kills, items, total_items,
                       secrets, total_secrets);
}


/* ---------- What the page calls ---------- */

static int mouse_dx = 0;
static int mouse_buttons = 0;
static int mouse_pending = 0;

// Web Audio's sample rate (44,100 or 48,000 Hz): the music is generated at that rate.
// Called before doom_start.
EXPORT("doom_set_sample_rate") void doom_set_sample_rate(int rate)
{
    snd_samplerate = rate;
}

// Loads doom1.wad and stays on the title screen with the menu open (New Game only)
EXPORT("doom_start") void doom_start(void)
{
    static char *arguments[] = { "doom", "-iwad", "doom1.wad", "-nogui", NULL };

    doomgeneric_Create(4, arguments);
    M_StartControlPanel();
}

// 1 if Doom's menu is open: there Ctrl, Space and the A button select
EXPORT("doom_in_menu") int doom_in_menu(void)
{
    return menuactive ? 1 : 0;
}

// Runs the game up to the clock's current tic (35 tics per second).
// Returns 0 if no new tic is due yet: this way the engine never stays waiting.
EXPORT("doom_tick") int doom_tick(void)
{
    static int last_tic = -1;
    int tic = I_GetTime();
    event_t event;

    if (tic == last_tic)
    {
        return 0;
    }
    last_tic = tic;

    // The mouse is sent only once per tic: Doom does not add up several movements, it keeps the last one
    if (mouse_pending)
    {
        event.type = ev_mouse;
        event.data1 = mouse_buttons;
        event.data2 = mouse_dx;
        event.data3 = 0;      // moving the mouse forward does not walk
        event.data4 = 0;
        D_PostEvent(&event);
        mouse_dx = 0;
        mouse_pending = 0;
    }

    doomgeneric_Tick();
    return 1;
}

// key: code from doomkeys.h (KEY_UPARROW, KEY_FIRE, KEY_USE, '1'…)
EXPORT("doom_key") void doom_key(int pressed, int key)
{
    event_t event;

    event.type = pressed ? ev_keydown : ev_keyup;
    event.data1 = key;
    event.data2 = pressed ? key : 0;
    event.data3 = 0;
    event.data4 = 0;
    D_PostEvent(&event);
}

// dx: turn accumulated since the last call; buttons: 1 = fire
EXPORT("doom_mouse") void doom_mouse(int dx, int buttons)
{
    mouse_dx += dx;
    if (dx != 0 || buttons != mouse_buttons)
    {
        mouse_pending = 1;
    }
    mouse_buttons = buttons;
}

// A new run: E1M1 from scratch, with the time at 0 (it applies on the next tic).
// Called by the menu's New Game (m_menu.c) and the console's "another run".
void DG_NewGame(void)
{
    M_ClearMenus();
    G_DeferedInitNew(DIFFICULTY, 1, 1);
}

EXPORT("doom_restart") void doom_restart(void)
{
    mouse_dx = 0;
    mouse_buttons = 0;
    mouse_pending = 1;
    DG_NewGame();
}

// Chocolate Doom's music player asks for it (i_oplmusic.c, midifile.c)
void *I_Realloc(void *ptr, size_t size)
{
    void *grown = realloc(ptr, size);

    if (size != 0 && grown == NULL)
    {
        I_Error("I_Realloc: out of memory for %i bytes", (int) size);
    }
    return grown;
}

// Tics of the level so far. They only advance during play; on dying, the level starts again at 0.
EXPORT("doom_time") int doom_time(void)
{
    return leveltime;
}

// Where the screen is in memory: 320 × 200 pixels of 32 bits
EXPORT("doom_screen") uint32_t doom_screen(void)
{
    return (uint32_t) (uintptr_t) DG_ScreenBuffer;
}


/* ---------- Sound: the effects play on the page with Web Audio ---------- */

// i_sound.c registers them in the configuration when there is sound (they normally come from the SDL module)
int use_libsamplerate = 0;
float libsamplerate_scale = 0.65f;

static boolean ds_prefix = true;

static boolean Sound_Init(boolean use_sfx_prefix)
{
    ds_prefix = use_sfx_prefix;
    return true;
}

static void Sound_Shutdown(void)
{
}

// The sound's lump name ("dspistol"…); -1 if the WAD does not have it
static int Sound_Lump(sfxinfo_t *sfx)
{
    char name[9];

    if (sfx->link != NULL)
    {
        sfx = sfx->link;
    }

    if (ds_prefix)
    {
        M_snprintf(name, sizeof(name), "ds%s", DEH_String(sfx->name));
    }
    else
    {
        M_StringCopy(name, DEH_String(sfx->name), sizeof(name));
    }

    return W_CheckNumForName(name);
}

static void Sound_Update(void)
{
}

static void Sound_Adjust(int channel, int volume, int separation)
{
    js_sound_adjust(channel, volume, separation);
}

static int Sound_Play(sfxinfo_t *sfx, int channel, int volume, int separation)
{
    int lump = sfx->lumpnum;

    if (lump < 0)
    {
        return -1;
    }

    // Each sound goes to the page only once: it is kept there already converted
    if (sfx->driver_data == NULL)
    {
        void *data = W_CacheLumpNum(lump, PU_STATIC);
        js_sound_load(lump, data, W_LumpLength(lump));
        W_ReleaseLumpNum(lump);
        sfx->driver_data = sfx;
    }

    js_sound_play(channel, lump, volume, separation);
    return channel;
}

static void Sound_Stop(int channel)
{
    js_sound_stop(channel);
}

static boolean Sound_IsPlaying(int channel)
{
    return js_sound_is_playing(channel) != 0;
}

static void Sound_Precache(sfxinfo_t *sounds, int count)
{
    (void) sounds;
    (void) count;
}

static snddevice_t sound_devices[] =
{
    SNDDEVICE_SB,
    SNDDEVICE_PAS,
    SNDDEVICE_GUS,
    SNDDEVICE_WAVEBLASTER,
    SNDDEVICE_SOUNDCANVAS,
    SNDDEVICE_AWE32,
};

sound_module_t DG_sound_module =
{
    sound_devices,
    arrlen(sound_devices),
    Sound_Init,
    Sound_Shutdown,
    Sound_Lump,
    Sound_Update,
    Sound_Adjust,
    Sound_Play,
    Sound_Stop,
    Sound_IsPlaying,
    Sound_Precache,
};

// The music is not here: i_sound.c uses music_opl_module (Chocolate Doom's i_oplmusic.c + opl_web.c)
