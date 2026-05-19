"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudioPrefs } from "./audio-prefs";

/** Per-keystroke click sound — synthesized via Web Audio API rather
 *  than a packaged asset. No fetch / decode latency, no extra HTTP,
 *  no copyright hassle, ~1ms tap-to-audible. The click is a short
 *  noise burst (~12ms) through a band-pass filter centred on ~1.6kHz
 *  with a fast exponential decay; mimics the mechanical-keyboard
 *  feel without claiming to be any specific switch.
 *
 *  Returns a stable `playClick` callback. Callers fire it on every
 *  printable / space / backspace keystroke — the hook itself owns
 *  the enabled / volume read so the caller never has to thread
 *  prefs through. When `enabled` is false the callback is a no-op
 *  and no AudioContext is constructed.
 *
 *  AudioContext is lazy: first call creates it (must run inside a
 *  user-gesture — keystrokes always qualify) and reuses for every
 *  subsequent click. Closing the page tears it down. */
export function useKeyClickSound() {
  const { prefs } = useAudioPrefs();
  const enabledRef = useRef(prefs.keypressClickEnabled);
  const volumeRef = useRef(prefs.keypressClickVolume);
  enabledRef.current = prefs.keypressClickEnabled;
  volumeRef.current = prefs.keypressClickVolume;

  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) {
        void ctx.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);

  return useCallback(() => {
    if (!enabledRef.current) return;
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    let ctx = ctxRef.current;
    if (!ctx) {
      try {
        ctx = new Ctor();
        ctxRef.current = ctx;
      } catch {
        return;
      }
    }
    // Some browsers start the context suspended until a user gesture
    // resumes it. Keystroke handlers ARE user gestures, so this
    // resume call is safe and idempotent.
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    playClick(ctx, volumeRef.current);
  }, []);
}

/** Fire one click into the given AudioContext at the given volume
 *  (0..100). Pure imperative WebAudio — no React, no state. Exported
 *  for the test suite + the appearance preview button on the audio
 *  settings row. */
export function playClick(ctx: AudioContext, volume: number): void {
  const safeVol = Math.max(0, Math.min(100, volume)) / 100;
  if (safeVol === 0) return;
  const now = ctx.currentTime;
  const DURATION = 0.018;
  // Short noise burst → band-pass → gain envelope → destination.
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * DURATION));
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1600;
  bp.Q.value = 2.2;
  const gain = ctx.createGain();
  // Peak gain scales with prefs volume; the exponential decay shapes
  // the burst into a click rather than a hiss.
  const peak = 0.6 * safeVol;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION);
  src.connect(bp);
  bp.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + DURATION + 0.02);
}
