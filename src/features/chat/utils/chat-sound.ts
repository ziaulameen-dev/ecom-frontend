/**
 * Lightweight in-browser audio synthesizer for incoming chat messages.
 * Uses Web Audio API sine oscillator so zero external sound files are loaded.
 */

const SOUND_MUTE_KEY = 'chat_sound_muted';

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SOUND_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_MUTE_KEY, String(muted));
  } catch {}
}

export function playIncomingChime() {
  if (typeof window === 'undefined') return;
  if (isSoundMuted()) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // WhatsApp-like pleasant two-tone chime (G5 -> C6)
    osc.frequency.setValueAtTime(784, now); // G5 note
    osc.frequency.setValueAtTime(1046.5, now + 0.07); // C6 note

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Ignore autoplay restriction or AudioContext initialization issues
  }
}
