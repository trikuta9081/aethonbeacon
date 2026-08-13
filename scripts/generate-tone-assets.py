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


# ── Ambient / ASMR / trend voices ───────────────────────────────────────────
# Direct port of TONE_TEXTURES / TONE_DRONES / TONE_EVENT_LAYERS in App.tsx.
# Before this, all 22 of these ids fell through to one generic ambient file on
# native and one 174 Hz sine on web, so "rain", "fireplace", "forest birds"
# and "Tibetan bowl" were audibly the same sound. Everything here is
# synthesised from noise and oscillators -- no sampled or third-party audio.

TEXTURES = {
    # id: (noise, filter, freq, q, gain, sweep_hz, sweep_depth, swell_hz, swell_depth)
    "ambient-rain":       ("white", "highpass", 900,  0.6, 0.30, 0.05,  260, 0.07, 0.16),
    "trend-rain-tent":    ("white", "lowpass",  2100, 0.7, 0.34, 0.04,  420, 0.05, 0.20),
    "ambient-ocean":      ("brown", "lowpass",  850,  0.6, 0.60, 0.08,  260, 0.08, 0.55),
    "ambient-wind":       ("pink",  "bandpass", 520,  0.8, 0.55, 0.045, 300, 0.06, 0.42),
    "trend-cafe":         ("brown", "lowpass",  700,  0.5, 0.50, 0.0,   0,   0.16, 0.22),
    "asmr-hush":          ("white", "lowpass",  3600, 0.5, 0.22, 0.0,   0,   0.10, 0.30),
    "reset-quiet":        ("pink",  "lowpass",  1800, 0.5, 0.16, 0.0,   0,   0.03, 0.10),
    "trend-fireplace":    ("brown", "lowpass",  1100, 0.6, 0.42, 0.0,   0,   0.12, 0.18),
    "trend-forest-birds": ("pink",  "lowpass",  1500, 0.5, 0.20, 0.0,   0,   0.05, 0.14),
    "asmr-paper":         ("white", "highpass", 2200, 0.7, 0.14, 0.0,   0,   0.0,  0.0),
    "ambient-breath":     ("pink",  "lowpass",  1200, 0.6, 0.40, 0.0,   0,   0.0,  0.0),
}

DRONES = {
    # id: (base, [(ratio, gain)], wave, lowpass, vib_hz, vib_cents, am_hz, am_depth, bed)
    "ambient-softdrone":   (110,   [(1,0.42),(1.5,0.20),(2,0.14),(3,0.05)], "sine", 1400, 0, 0, 0.06, 0.18, None),
    "trend-432-guitar":    (432,   [(1,0.30),(2,0.12),(3,0.06),(4,0.03)], "triangle", 2600, 0, 0, 0.10, 0.22, None),
    "trend-528-miracle":   (528,   [(1,0.34),(2,0.10)], "sine", 0, 0, 0, 0.08, 0.16, None),
    "trend-om-chant":      (136.1, [(1,0.36),(2,0.16),(3,0.09),(4,0.04)], "sine", 1600, 0, 0, 0.18, 0.34, None),
    "trend-krishna-flute": (587.3, [(1,0.26),(2,0.07),(3,0.03)], "triangle", 3200, 5.2, 22, 0.22, 0.30, ("pink", 2600, 0.06)),
    "asmr-hum":            (100,   [(1,0.40),(2,0.12)], "sine", 900, 0.9, 8, 0, 0, None),
    "trend-deep-sleep":    (60,    [(1,0.46),(1.5,0.16),(2,0.08)], "sine", 400, 0, 0, 0.04, 0.12, None),
    "trend-schumann":      (98,    [(1,0.40),(2,0.10)], "sine", 700, 0, 0, 7.83, 0.45, None),
    "trend-lofi":          (220,   [(1,0.26),(1.5,0.14),(2,0.10),(2.5,0.05)], "triangle", 1250, 0, 0, 0.14, 0.20, ("brown", 5200, 0.05)),
    "trend-tibetan-bowl":  (196,   [(1,0.30),(2.74,0.14),(5.41,0.07),(8.9,0.03)], "sine", 4200, 0, 0, 0.05, 0.20, None),
    "asmr-bell":           (523.3, [(1,0.22),(2.76,0.10),(5.4,0.04)], "sine", 5200, 0, 0, 0, 0, None),
}

EVENTS = {
    # id: (per_minute, f_lo, f_hi, decay, gain, wave, pitch_drop)
    "trend-fireplace":    (46, 420, 1500, 0.11, 0.16, "triangle", True),
    "trend-forest-birds": (11, 1900, 3400, 0.30, 0.10, "sine", False),
    "asmr-paper":         (22, 1600, 3000, 0.20, 0.13, "triangle", True),
    "asmr-bell":          (5,  523, 523,  4.20, 0.20, "sine", False),
    "trend-tibetan-bowl": (4,  196, 196,  7.00, 0.22, "sine", False),
}

# Struck voices sit quiet until the event layer hits them, same as web.
STRUCK = {"asmr-bell", "trend-tibetan-bowl"}

AMBIENT_SECONDS = 20.0


def _raw_noise(kind, n):
    w = np.random.uniform(-1, 1, n)
    if kind == "brown":
        out = np.zeros(n); last = 0.0
        for i in range(n):
            last = (last + 0.02 * w[i]) / 1.02
            out[i] = last * 3.5
        return out
    if kind == "pink":
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
        return out
    return w * 0.35


def one_pole_highpass(x, cutoff_hz):
    return x - one_pole_lowpass(x, cutoff_hz)


def _apply_filter(x, kind, freq, q):
    if kind == "lowpass":
        return one_pole_lowpass(x, freq)
    if kind == "highpass":
        return one_pole_highpass(x, freq)
    # bandpass = low-passed above, high-passed below
    return one_pole_lowpass(one_pole_highpass(x, freq * 0.6), freq * 1.9)


def _wave(kind, phase):
    if kind == "triangle":
        return 2.0 / np.pi * np.arcsin(np.sin(phase))
    return np.sin(phase)



TARGET_RMS = 0.11
LOOP_CROSSFADE_SEC = 1.2


def loop_seam(sig, xf):
    """Make a buffer loop without a click or a gap.

    Overlaps the last `xf` samples onto the first `xf` with an equal-power
    crossfade, then drops the consumed tail. Playing the result on repeat is
    continuous.
    """
    n = len(sig)
    xf = min(xf, n // 3)
    if xf < 2:
        return sig
    head = sig[:xf].copy()
    tail = sig[-xf:]
    ramp = np.linspace(0, 1, xf).reshape(-1, 1)
    merged = head * np.sqrt(ramp) + tail * np.sqrt(1 - ramp)
    out = sig[:-xf].copy()
    out[:xf] = merged
    return out

def gen_ambient(tone_id, duration=AMBIENT_SECONDS):
    n = int(SR * duration)
    t = np.arange(n) / SR
    mix = np.zeros((n, 2))

    spec = TEXTURES.get(tone_id)
    if spec:
        noise_kind, filt, freq, q, gain, sweep_hz, sweep_depth, swell_hz, swell_depth = spec
        for ch in range(2):
            raw = _raw_noise(noise_kind, n)
            if sweep_hz > 0 and sweep_depth > 0:
                # Approximate the web LFO on filter cutoff by blending a
                # brighter and a darker pass -- cheaper than a time-varying
                # filter and audibly equivalent on a slow sweep.
                bright = _apply_filter(raw, filt, freq + sweep_depth, q)
                dark = _apply_filter(raw, filt, max(60.0, freq - sweep_depth), q)
                blend = 0.5 + 0.5 * np.sin(2 * np.pi * sweep_hz * t)
                body = bright * blend + dark * (1 - blend)
            else:
                body = _apply_filter(raw, filt, freq, q)
            env = np.ones(n) * gain
            if swell_hz > 0 and swell_depth > 0:
                env = gain * (1 + swell_depth * np.sin(2 * np.pi * swell_hz * t + ch * 0.6))
            if tone_id == "ambient-breath":
                # 4s draw, 6s release -- the pattern Calm already coaches.
                cyc = np.mod(t, 10.0)
                env = np.where(cyc < 4.0, 0.06 + (gain - 0.06) * (cyc / 4.0),
                               gain - (gain - 0.06) * ((cyc - 4.0) / 6.0))
            mix[:, ch] += body * env

    drone = DRONES.get(tone_id)
    if drone:
        base, partials, wave_kind, lowpass, vib_hz, vib_cents, am_hz, am_depth, bed = drone
        voice = np.zeros(n)
        for ratio, gain in partials:
            f = base * ratio
            if vib_hz > 0 and vib_cents > 0:
                depth_hz = f * (2 ** (vib_cents / 1200.0) - 1)
                phase = 2*np.pi*f*t - (depth_hz/vib_hz)*np.cos(2*np.pi*vib_hz*t)
            else:
                phase = 2 * np.pi * f * t
            voice += gain * (0.25 if tone_id in STRUCK else 1.0) * _wave(wave_kind, phase)
        if lowpass:
            voice = one_pole_lowpass(voice, lowpass)
        if am_hz > 0 and am_depth > 0:
            voice *= (1 - am_depth * 0.5) + am_depth * np.sin(2 * np.pi * am_hz * t)
        mix[:, 0] += voice
        mix[:, 1] += voice
        if bed:
            bed_kind, bed_freq, bed_gain = bed
            for ch in range(2):
                mix[:, ch] += one_pole_lowpass(_raw_noise(bed_kind, n), bed_freq) * bed_gain

    ev = EVENTS.get(tone_id)
    if ev:
        per_min, f_lo, f_hi, decay, gain, wave_kind, drop = ev
        total = max(1, int(round(per_min * duration / 60.0)))
        mean_gap = duration / total
        at = 0.6
        for _ in range(total * 2):
            at += mean_gap * np.random.uniform(0.35, 1.65)
            if at + decay >= duration:
                break
            start = int(at * SR)
            length = int(decay * SR)
            tt = np.arange(length) / SR
            f0 = np.random.uniform(f_lo, f_hi)
            if drop:
                f_end = max(80.0, f0 * 0.45)
                inst = f0 * (f_end / f0) ** (tt / decay)
                phase = 2 * np.pi * np.cumsum(inst) / SR
            else:
                phase = 2 * np.pi * f0 * tt
            env = np.exp(-tt / (decay * 0.30)) * gain * np.random.uniform(0.5, 1.1)
            hit = _wave(wave_kind, phase) * env
            end = min(start + length, n)
            mix[start:end, 0] += hit[:end - start]
            mix[start:end, 1] += hit[:end - start]

    # Level-match across the family. Without this a drone renders ~15x hotter
    # than a rain bed, so switching tones at a fixed volume slider would jump
    # from inaudible to startling.
    rms = float(np.sqrt((mix ** 2).mean())) or 1.0
    mix *= TARGET_RMS / rms
    peak = float(np.max(np.abs(mix))) or 1.0
    if peak > 0.92:
        mix *= 0.92 / peak

    # These files loop for the length of a session, so fading both edges to
    # silence (what fade_edges does) would pulse audibly every 20 seconds.
    # Crossfade the tail back over the head instead: seamless, no seam dip.
    return loop_seam(mix, int(SR * LOOP_CROSSFADE_SEC))

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

# The ambient family ships as MP3 only. At 20 seconds stereo these would add
# ~70 MB of WAV to the repository for no benefit: App.tsx's NATIVE_TONE_ASSETS
# requires the .mp3, and the WAV is only ever an intermediate here.
import shutil
import subprocess
import tempfile

_ffmpeg = shutil.which("ffmpeg")
for tone_id in sorted(set(TEXTURES) | set(DRONES)):
    audio = gen_ambient(tone_id)
    if _ffmpeg is None:
        # No encoder available -- fall back to WAV so the run still produces
        # usable audio rather than silently skipping these tones.
        write_wav(os.path.join(OUT_DIR, f"{tone_id}.wav"), audio)
        count += 1
        continue
    with tempfile.TemporaryDirectory() as tmp:
        tmp_wav = os.path.join(tmp, f"{tone_id}.wav")
        write_wav(tmp_wav, audio)
        subprocess.run(
            [_ffmpeg, "-y", "-loglevel", "error", "-i", tmp_wav,
             "-codec:a", "libmp3lame", "-b:a", "128k",
             os.path.join(OUT_DIR, f"{tone_id}.mp3")],
            check=True,
        )
    count += 1

print(f"Wrote {count} tone WAV files to {OUT_DIR}")
