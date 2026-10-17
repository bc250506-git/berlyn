// Zero-latency, zero-bundle-cost Web Audio API sound synthesizer
// Designed specifically for intimate, satisfying, non-intrusive micro-haptics.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('berlyn_sound_muted') === 'true';
  } catch {
    return false;
  }
}

export function toggleSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const next = !isSoundMuted();
    localStorage.setItem('berlyn_sound_muted', String(next));
    window.dispatchEvent(new Event('sound_mute_changed'));
    return next;
  } catch {
    return false;
  }
}

// Master volume gain scaler
const MASTER_GAIN = 0.12;

/**
 * 1. Watchlist Completed / General Achievement Chime (523Hz -> 659Hz)
 */
export function playChime() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.08);
  osc1.stop(now + 0.45);
  osc2.stop(now + 0.45);
}

/**
 * 2. Wooden / Marimba Pop (Star Rating, 440Hz short tap)
 */
export function playPop() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

  gain.gain.setValueAtTime(MASTER_GAIN * 1.2, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * 3. Message Send Whoosh (Modern messaging swoosh)
 */
export function playWhoosh() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN * 0.9, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.18);
}

/**
 * 4. Shutter / Photo Upload Tap
 */
export function playShutter() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(1400, now);
  osc2.frequency.setValueAtTime(950, now + 0.04);

  gain.gain.setValueAtTime(MASTER_GAIN * 0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.04);
  osc1.stop(now + 0.08);
  osc2.stop(now + 0.15);
}

/**
 * 5. Romantic Harp Arpeggio (Notes for Each Other: C5 - E5 - G5)
 */
export function playHarp() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const now = ctx.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * 0.07;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(MASTER_GAIN * 0.85, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.45);
  });
}

/**
 * 6. Cash-in Upward Chime (Finance: Income, 587Hz -> 880Hz)
 */
export function playCash() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(587.33, now); // D5
  osc2.frequency.setValueAtTime(880.0, now + 0.08); // A5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.08);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}

/**
 * 7. Neutral Tactile Tap (Finance: Expense, 220Hz thud)
 */
export function playTap() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

  gain.gain.setValueAtTime(MASTER_GAIN * 0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * 8. Crystal Ding (Finance: Asset / Investment, 1046Hz high ping)
 */
export function playCrystal() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046.5, now); // C6

  gain.gain.setValueAtTime(MASTER_GAIN * 1.1, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}

/**
 * 9. Resonant Safe Ping (Finance: Compound Interest Account, 440Hz + 880Hz)
 */
export function playSafeLock() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(440, now);
  osc2.frequency.setValueAtTime(880, now);

  gain.gain.setValueAtTime(MASTER_GAIN, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}

/**
 * 10. Metallic Coin Drop (Penalty Jar fine addition, 1800Hz & 2400Hz)
 */
export function playCoin() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  osc1.frequency.setValueAtTime(1760, now); // A6
  osc2.frequency.setValueAtTime(2637, now + 0.03); // E7

  gain.gain.setValueAtTime(MASTER_GAIN * 1.2, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.03);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}

/**
 * 11. Fanfare Melody (Penalty Goal achieved, C5 - E5 - G5 - C6)
 */
export function playFanfare() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const now = ctx.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * 0.1;

    osc.type = i === 3 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(MASTER_GAIN * 1.1, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
}

/**
 * 12. Switch Toggle (Daily Choice vote, 480Hz)
 */
export function playVote() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(480, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

  gain.gain.setValueAtTime(MASTER_GAIN * 0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * 13. Harmony Unison Chime (When both vote the same choice!)
 */
export function playMatch() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc2.frequency.setValueAtTime(783.99, now); // G5 (Perfect 5th)

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN * 1.2, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.55);
  osc2.stop(now + 0.55);
}

/**
 * 14. Seal Pop (Daily Prompt secret answer submit)
 */
export function playSeal() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

  gain.gain.setValueAtTime(MASTER_GAIN * 0.95, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

/**
 * 15. Task Check Ping (Agenda Checkbox, 659Hz clean chime)
 */
export function playTaskCheck() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(659.25, now); // E5
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.06); // A5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(MASTER_GAIN * 1.0, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.28);
}

/**
 * 16. Magical Sparkle Sweep (Bucket List Dream Completed)
 */
export function playSparkle() {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const freqs = [784, 988, 1175, 1568]; // G5, B5, D6, G6
  const now = ctx.currentTime;

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.06;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(MASTER_GAIN * 0.9, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}
