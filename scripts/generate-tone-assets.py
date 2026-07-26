#!/usr/bin/env python3
"""
generate-tone-assets.py

Renders real, distinct WAV files for every precisely-specified relaxing tone
mode (binaural beats, solfeggio/AUM sustained tones, procedural noise colors,
bilateral pulses, isochronic pulses) so the native (Android/iOS) app can play
the actual matching sound per tone instead of one generic ambient file.

Every synthesis algorithm here is a direct port of the Web Audio implementation
in App.tsx's startContinuousTone() -- same frequency tables, same harmonic
gains, same noise-filter coefficients, same pulse envelopes -- so native output
matches what the web build has always produced. This does NOT invent new
sound design; it makes native match the existing, already-shipped web engine.

Categories intentionally NOT covered here (ambient-rain/ocean/wind/softdrone/
breath, asmr-hush/paper/hum/bell, reset-quiet, trend-*) are not given unique
audio because the web implementation itself has no distinct synthesis for
them either -- they all fall through to the same generic 174 Hz sustained
sine "else" branch in startContinuousTone(). Native already plays one
generic ambient file for these, which is honest parity with web, not a gap.

Output: assets/tones/<id>.wav (44.1kHz, 16-bit stereo PCM)
"""

import numpy as np
import wave
import struct
import os

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "tones")
os.makedirs(OUT_DIR, exist_ok=True)

def write_wav(path, stereo_float):
    """stereo_float: np.ndarray shape (N, 2), values in [-1, 1]."""
    stereo_float = np.clip(stereo_float, -1.0, 1.0)
    pcm = (stereo_float * 32767.0).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

def fade_edges(sig, fade_samples):
    """Apply a short linear fade-in/out so loop boundaries don't click."""
    n = len(sig)
    fade_samples = min(fade_samples, n // 2)
    ramp = np.linspace(0, 1, fade_samples).reshape(-1, 1)
    sig = sig.copy()
    sig[:fade_samples] *= ramp
    sig[-fade_samples:] *= ramp[::-1]
    return sig

# ── Binaural beats: two pure sine oscillators, hard-panned L/R ──────────────
# Matches BINAURAL_FREQ in App.tsx exactly.
BINAURAL_FREQ = {
    "binaural-delta-1":    (100, 101),
    "binaural-delta-2":    (100, 102),
    "binaural-theta-4":    (200, 204),
    "binaural-theta-5":    (200, 205),
    "binaural-alpha-6":    (220, 226),
    "binaural-alpha-7":    (220, 227),
    "binaural-alpha-8":    (220, 228),
    "binaural-alpha-10":   (200, 210),
    "binaural-alpha-12":   (250, 262),
    "binaural-reset-14":   (250, 264),
    "binaural-release-16": (200, 216),
    "binaural-gamma-40":   (220, 260),
}

def gen_binaural(fL, fR, duration=12.0):
    t = np.arange(int(SR * duration)) / SR
    left = 0.55 * np.sin(2 * np.pi * fL * t)
    right = 0.55 * np.sin(2 * np.pi * fR * t)
    stereo = np.stack([left, right], axis=1)
    return fade_edges(stereo, int(SR * 0.05))

# ── Solfeggio / AUM: fundamental + 2nd + 3rd harmonic (Tibetan-bowl colour) ─
SOL_FREQ = {
    "sol-396": 396, "sol-417": 417, "sol-432": 432, "sol-528": 528,
    "sol-639": 639, "sol-741": 741, "sol-852": 852, "sol-963": 963,
    "aum-136": 136.1,
}

def gen_solfeggio(freq, duration=12.0):
    t = np.arange(int(SR * duration)) / SR
    tone = (
        0.60 * np.sin(2 * np.pi * freq * t)
        + 0.07 * np.sin(2 * np.pi * freq * 2 * t)
        + 0.025 * np.sin(2 * np.pi * freq * 3 * t)
    )
    stereo = np.stack([tone, tone], axis=1)
    return fade_edges(stereo, int(SR * 0.05))

# ── Procedural noise: same filters as the web buffer generator ─────────────
def one_pole_lowpass(x, cutoff_hz):
    if cutoff_hz >= SR / 2:
        return x
    rc = 1.0 / (2 * np.pi * cutoff_hz)
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    y = np.zeros_like(x)
    y[0] = x[0]
    for i in range(1, len(x)):
        y[i] = y[i - 1] + alpha * (x[i] - y[i - 1])
    return y

def gen_noise(kind, duration=6.0):
    n = int(SR * duration)
    channels = []
    for _ch in range(2):
        w = np.random.uniform(-1, 1, n)
        if kind == "noise-brown":
            last = 0.0
            out = np.zeros(n)
            for i in range(n):
                last = (last + 0.02 * w[i]) / 1.02
                out[i] = last * 3.5
            out = one_pole_lowpass(out, 600)
        elif kind == "noise-pink":
            b0=b1=b2=b3=b4=b5=b6=0.0
            out = np.zeros(n)
            for i in range(n):
                b0 = 0.99886*b0 + w[i]*0.0555179
                b1 = 0.99332*b1 + w[i]*0.0750759
                b2 = 0.96900*b2 + w[i]*0.1538520
                b3 = 0.86650*b3 + w[i]*0.3104856
                b4 = 0.55000*b4 + w[i]*0.5329522
                b5 = -0.7616*b5 - w[i]*0.0168980
                out[i] = (b0+b1+b2+b3+b4+b5+b6+w[i]*0.5362)*0.11
                b6 = w[i]*0.115926
            out = one_pole_lowpass(out, 5000)
        else:  # white
            out = w * 0.35
        channels.append(out)
    stereo = np.stack(channels, axis=1)
    return fade_edges(stereo, int(SR * 0.03))

# ── Bilateral: alternating L/R gated pulses of a 180 Hz carrier ────────────
BILATERAL_HZ = {
    "bilateral-soft-1": 1.0,
    "bilateral-soft-2": 1.5,
    "bilateral-soft-3": 2.0,
}

def gen_bilateral(beat_hz, base_freq=180.0, cycles=10):
    period = 1.0 / beat_hz
    pulse_dur = period * 0.42
    duration = period * cycles
    n = int(SR * duration)
    t = np.arange(n) / SR
    carrier = np.sin(2 * np.pi * base_freq * t)
    left = np.zeros(n)
    right = np.zeros(n)
    for i in range(cycles):
        start_t = i * period
        attack = 0.018
        # envelope: 0 -> 0.65 over `attack`s, 0.65 -> 0 over remaining pulse_dur
        start_i = int(start_t * SR)
        attack_i = int(attack * SR)
        end_i = int((start_t + pulse_dur) * SR)
        end_i = min(end_i, n)
        env = np.zeros(n)
        if start_i + attack_i <= n:
            env[start_i:start_i + attack_i] = np.linspace(0, 0.65, attack_i)
        if start_i + attack_i < end_i:
            release_len = end_i - (start_i + attack_i)
            env[start_i + attack_i:end_i] = np.linspace(0.65, 0, release_len)
        target = left if i % 2 == 0 else right
        target += env * carrier
    stereo = np.stack([left, right], axis=1)
    return stereo  # already loops cleanly at cycle boundaries (starts/ends at 0)

# ── Isochronic / gamma: single-channel carrier gated at beat frequency ─────
ISO_PARAMS = {
    "iso-1": (200, 1), "iso-2": (200, 2), "iso-3": (200, 3),
    "iso-4": (200, 4), "iso-6": (200, 6), "iso-8": (220, 8), "iso-10": (220, 10),
    "reset-gamma": (220, 40),
}

def gen_iso(carrier_freq, beat_freq, cycles=None):
    period = 1.0 / beat_freq
    pulse_dur = period * 0.46
    attack = min(0.008, period * 0.08)
    if cycles is None:
        # keep files a reasonable length regardless of beat frequency
        cycles = max(8, int(round(4.0 / period)))
    duration = period * cycles
    n = int(SR * duration)
    t = np.arange(n) / SR
    carrier = np.sin(2 * np.pi * carrier_freq * t)
    mono = np.zeros(n)
    for i in range(cycles):
        start_t = i * period
        start_i = int(start_t * SR)
        attack_i = max(1, int(attack * SR))
        end_i = min(int((start_t + pulse_dur) * SR), n)
        if start_i + attack_i <= n:
            mono[start_i:start_i + attack_i] = np.linspace(0, 0.65, attack_i)
        if start_i + attack_i < end_i:
            release_len = end_i - (start_i + attack_i)
            mono[start_i + attack_i:end_i] = np.linspace(0.65, 0, release_len)
    mono *= carrier
    stereo = np.stack([mono, mono], axis=1)
    return stereo

# ── Render everything ───────────────────────────────────────────────────────
count = 0

for tone_id, (fL, fR) in BINAURAL_FREQ.items():
    write_wav(os.path.join(OUT_DIR, f"{tone_id}.wav"), gen_binaural(fL, fR))
    count += 1

for tone_id, freq in SOL_FREQ.items():
    write_wav(os.path.join(OUT_DIR, f"{tone_id}.wav"), gen_solfeggio(freq))
    count += 1

for tone_id in ["noise-brown", "noise-pink", "noise-white"]:
    write_wav(os.path.join(OUT_DIR, f"{tone_id}.wav"), gen_noise(tone_id))
    count += 1

for tone_id, hz in BILATERAL_HZ.items():
    write_wav(os.path.join(OUT_DIR, f"{tone_id}.wav"), gen_bilateral(hz))
    count += 1

for tone_id, (carrier, beat) in ISO_PARAMS.items():
    write_wav(os.path.join(OUT_DIR, f"{tone_id}.wav"), gen_iso(carrier, beat))
    count += 1

print(f"Wrote {count} tone WAV files to {OUT_DIR}")
