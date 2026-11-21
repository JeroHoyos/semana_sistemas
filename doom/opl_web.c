// =============================================
// DOOM MUSIC IN THE BROWSER: the emulated OPL chip (AdLib / Sound Blaster)
//
// Doom's music played on the FM OPL chip of sound cards. Chocolate Doom's
// player (i_oplmusic.c) drives the chip like the original driver, and the Nuked OPL3
// emulator (opl3.c) makes the sound. This file replaces Chocolate Doom's opl.c and
// opl_sdl.c: instead of threads and SDL, the page asks for samples with doom_music_generate
// (from Web Audio) and the music clock advances here by what those samples last.
//
// Based on Chocolate Doom's opl/opl.c and opl/opl_sdl.c (GPL-2.0, Simon Howard).
// =============================================

#include <stdint.h>
#include <string.h>

#include "opl.h"
#include "opl3.h"
#include "opl_queue.h"

#define EXPORT(name) __attribute__((export_name(name)))

// The most the page asks for at once (4096 frames is normal)
#define MAX_FRAMES 16384

static unsigned int sample_rate = 44100;
static opl3_chip chip;
static opl_callback_queue_t *queue = NULL;   // the song's events, sorted by time
static uint64_t current_time = 0;          // microseconds of music generated
static uint64_t pause_offset = 0;
static int paused_now = 0;
static int reg_index = 0;
static int started = 0;
static int16_t samples[MAX_FRAMES * 2];   // interleaved stereo: left, right, left…


/* ---------- What i_oplmusic.c asks for (opl.h) ---------- */

opl_init_result_t OPL_Init(unsigned int port_base)
{
    (void) port_base;

    if (queue == NULL)
    {
        queue = OPL_Queue_Create();
    }
    OPL_Queue_Clear(queue);
    OPL3_Reset(&chip, sample_rate);
    current_time = 0;
    pause_offset = 0;
    paused_now = 0;
    started = 1;

    // It is an OPL3, but i_oplmusic.c only uses its extra features with DMXOPTION=-opl3:
    // by default it sounds like an OPL2, just as in 1993
    return OPL_INIT_OPL3;
}

void OPL_Shutdown(void)
{
    started = 0;
    if (queue != NULL)
    {
        OPL_Queue_Clear(queue);
    }
}

void OPL_SetSampleRate(unsigned int rate)
{
    sample_rate = rate;
}

void OPL_WritePort(opl_port_t port, unsigned int value)
{
    if (port == OPL_REGISTER_PORT)
    {
        reg_index = value;
    }
    else if (port == OPL_REGISTER_PORT_OPL3)
    {
        reg_index = value | 0x100;
    }
    else if (port == OPL_DATA_PORT)
    {
        // The chip's timers only serve to detect it; that is not needed here
        if (reg_index != OPL_REG_TIMER1 && reg_index != OPL_REG_TIMER2 && reg_index != OPL_REG_TIMER_CTRL)
        {
            OPL3_WriteRegBuffered(&chip, (uint16_t) reg_index, (uint8_t) value);
        }
    }
}

unsigned int OPL_ReadPort(opl_port_t port)
{
    return port == OPL_REGISTER_PORT_OPL3 ? 0xff : 0;
}

unsigned int OPL_ReadStatus(void)
{
    return OPL_ReadPort(OPL_REGISTER_PORT);
}

// Without the original's wait reads: the emulator does not need them
void OPL_WriteRegister(int reg, int value)
{
    OPL_WritePort((reg & 0x100) ? OPL_REGISTER_PORT_OPL3 : OPL_REGISTER_PORT, reg);
    OPL_WritePort(OPL_DATA_PORT, value);
}

opl_init_result_t OPL_Detect(void)
{
    return OPL_INIT_OPL3;
}

// The same registers Doom writes on startup (copied from opl.c)
void OPL_InitRegisters(int opl3)
{
    int r;

    for (r = OPL_REGS_LEVEL; r <= OPL_REGS_LEVEL + OPL_NUM_OPERATORS; ++r)
    {
        OPL_WriteRegister(r, 0x3f);
    }
    for (r = OPL_REGS_ATTACK; r <= OPL_REGS_WAVEFORM + OPL_NUM_OPERATORS; ++r)
    {
        OPL_WriteRegister(r, 0x00);
    }
    for (r = 1; r < OPL_REGS_LEVEL; ++r)
    {
        OPL_WriteRegister(r, 0x00);
    }

    OPL_WriteRegister(OPL_REG_TIMER_CTRL, 0x60);
    OPL_WriteRegister(OPL_REG_TIMER_CTRL, 0x80);
    OPL_WriteRegister(OPL_REG_WAVEFORM_ENABLE, 0x20);

    if (opl3)
    {
        OPL_WriteRegister(OPL_REG_NEW, 0x01);
        for (r = OPL_REGS_LEVEL; r <= OPL_REGS_LEVEL + OPL_NUM_OPERATORS; ++r)
        {
            OPL_WriteRegister(r | 0x100, 0x3f);
        }
        for (r = OPL_REGS_ATTACK; r <= OPL_REGS_WAVEFORM + OPL_NUM_OPERATORS; ++r)
        {
            OPL_WriteRegister(r | 0x100, 0x00);
        }
        for (r = 1; r < OPL_REGS_LEVEL; ++r)
        {
            OPL_WriteRegister(r | 0x100, 0x00);
        }
    }

    OPL_WriteRegister(OPL_REG_FM_MODE, 0x40);

    if (opl3)
    {
        OPL_WriteRegister(OPL_REG_NEW, 0x01);
    }
}

void OPL_SetCallback(uint64_t us, opl_callback_t callback, void *data)
{
    OPL_Queue_Push(queue, callback, data, current_time - pause_offset + us);
}

void OPL_ClearCallbacks(void)
{
    OPL_Queue_Clear(queue);
}

// A single thread: there is nothing to lock
void OPL_Lock(void)
{
}

void OPL_Unlock(void)
{
}

// Only used to detect the chip; a single thread cannot wait for the music
void OPL_Delay(uint64_t us)
{
    (void) us;
}

void OPL_SetPaused(int paused)
{
    paused_now = paused;
}

void OPL_AdjustCallbacks(float factor)
{
    OPL_Queue_AdjustCallbacks(queue, current_time, factor);
}


/* ---------- What the page calls ---------- */

// Advances the music clock and fires the events now due (notes, instrument changes…)
static void AdvanceTime(unsigned int frames)
{
    opl_callback_t callback;
    void *data;
    uint64_t us = ((uint64_t) frames * OPL_SECOND) / sample_rate;

    current_time += us;
    if (paused_now)
    {
        pause_offset += us;
    }

    while (!OPL_Queue_IsEmpty(queue)
        && current_time >= OPL_Queue_Peek(queue) + pause_offset)
    {
        if (!OPL_Queue_Pop(queue, &callback, &data))
        {
            break;
        }
        callback(data);
    }
}

// Generates music frames (stereo, 16 bits) and returns where they are.
// Like opl_sdl.c's OPL_Mix_Callback: generates up to the next event, fires it and goes on.
EXPORT("doom_music_generate") int16_t *doom_music_generate(int frames)
{
    unsigned int filled = 0;

    if (frames > MAX_FRAMES)
    {
        frames = MAX_FRAMES;
    }
    if (!started || frames <= 0)
    {
        memset(samples, 0, sizeof(samples));
        return samples;
    }

    while (filled < (unsigned int) frames)
    {
        uint64_t count = (unsigned int) frames - filled;

        if (!paused_now && !OPL_Queue_IsEmpty(queue))
        {
            uint64_t next = OPL_Queue_Peek(queue) + pause_offset;
            uint64_t until_next = next > current_time
                ? ((next - current_time) * sample_rate + OPL_SECOND - 1) / OPL_SECOND
                : 0;
            if (until_next < count)
            {
                count = until_next;
            }
        }

        if (count > 0)
        {
            OPL3_GenerateStream(&chip, samples + filled * 2, (uint32_t) count);
            filled += (unsigned int) count;
        }
        AdvanceTime((unsigned int) count);
    }

    return samples;
}
