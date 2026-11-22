// Every sound in the game is a small oscillator bleat — no audio files, no
// network. The context wakes on the first gesture, as browsers require.

export function createAudio() {
  let context = null;
  let muted = false;
  let lastAlarmBeep = 0;

  function ensureContext() {
    if (context === null) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) context = new AudioCtor();
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, seconds, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + seconds);
    gain.gain.setValueAtTime(volume || 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    playStep() {
      tone(180, 0.05, 'triangle', 0.018);
    },
    playCoinClink() {
      tone(1560, 0.09, 'square', 0.035, 2100);
      tone(2340, 0.12, 'sine', 0.03);
    },
    playSmoke() {
      tone(320, 0.28, 'sine', 0.05, 90);
    },
    playEmp() {
      tone(1200, 0.3, 'sawtooth', 0.04, 120);
    },
    playSideLoot() {
      tone(990, 0.08, 'sine', 0.045, 1480);
    },
    playVaultDing() {
      tone(880, 0.16, 'sine', 0.06);
      setTimeout(() => tone(1320, 0.22, 'sine', 0.06), 110);
      setTimeout(() => tone(1760, 0.3, 'sine', 0.05), 240);
    },
    playLaserZap() {
      tone(2400, 0.14, 'square', 0.05, 300);
    },
    playCaughtSting() {
      tone(220, 0.4, 'sawtooth', 0.07, 55);
      setTimeout(() => tone(160, 0.5, 'sawtooth', 0.06, 40), 140);
    },
    playClearJingle() {
      tone(660, 0.14, 'triangle', 0.06);
      setTimeout(() => tone(880, 0.14, 'triangle', 0.06), 120);
      setTimeout(() => tone(1100, 0.26, 'triangle', 0.06), 250);
    },
    /** Alarm beeps climb in pitch and hurry as the meter fills. */
    playAlarmBeep(alarmValue, nowSeconds) {
      if (alarmValue < 30) return;
      const interval = alarmValue >= 70 ? 0.42 : 0.8;
      if (nowSeconds - lastAlarmBeep < interval) return;
      lastAlarmBeep = nowSeconds;
      tone(520 + alarmValue * 6, 0.09, 'square', 0.03);
    },
  };
}
