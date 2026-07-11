// Realistic top-down combat synthesized audio generator using Web Audio API
class AudioEngineClass {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Synthesize realistic gunshot sounds based on tactical weapons
  playShoot(weaponId) {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Create a physical punch oscillator
    const osc = ctx.createOscillator();
    const gainOsc = ctx.createGain();
    osc.connect(gainOsc);
    gainOsc.connect(ctx.destination);

    // Create a high-pressure gunpowder gas blast noise filter
    const noiseBuffer = this.createNoiseBuffer();
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    
    const gainNoise = ctx.createGain();
    noiseNode.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(ctx.destination);

    if (weaponId === 0) {
      // Starter Pistol: crisp, moderately sharp crackle
      osc.type = "triangle";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gainOsc.gain.setValueAtTime(0.2, now);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(4, now);
      gainNoise.gain.setValueAtTime(0.18, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.15);
      noiseNode.start(now);
      noiseNode.stop(now + 0.15);

    } else if (weaponId === 1) {
      // Tactical Pistol: punchier, slightly deeper signature
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
      gainOsc.gain.setValueAtTime(0.25, now);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      filter.frequency.setValueAtTime(1000, now);
      filter.Q.setValueAtTime(3, now);
      gainNoise.gain.setValueAtTime(0.25, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
      noiseNode.start(now);
      noiseNode.stop(now + 0.18);

    } else if (weaponId === 2) {
      // Assault Rifle: loud, high acoustic reflection, metallic tail
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);
      gainOsc.gain.setValueAtTime(0.35, now);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      filter.frequency.setValueAtTime(1500, now);
      filter.Q.setValueAtTime(5, now);
      gainNoise.gain.setValueAtTime(0.35, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      // Gunshot echo reflection tail
      const echoNode = ctx.createDelay();
      echoNode.delayTime.setValueAtTime(0.04, now);
      const echoGain = ctx.createGain();
      echoGain.gain.setValueAtTime(0.12, now);
      echoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      filter.connect(echoNode);
      echoNode.connect(echoGain);
      echoGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
      noiseNode.start(now);
      noiseNode.stop(now + 0.22);

    } else if (weaponId === 3) {
      // SMG: extremely fast, high-frequency pop
      osc.type = "triangle";
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
      gainOsc.gain.setValueAtTime(0.2, now);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(6, now);
      gainNoise.gain.setValueAtTime(0.22, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
      noiseNode.start(now);
      noiseNode.stop(now + 0.12);

    } else if (weaponId === 4) {
      // Shotgun: massive wide blast, thick acoustic impact, heavy low rumbling
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
      gainOsc.gain.setValueAtTime(0.5, now);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      // Lower frequency thump for heavy shell discharge
      const heavyOsc = ctx.createOscillator();
      const heavyGain = ctx.createGain();
      heavyOsc.type = "sine";
      heavyOsc.frequency.setValueAtTime(80, now);
      heavyOsc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
      heavyGain.gain.setValueAtTime(0.4, now);
      heavyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      heavyOsc.connect(heavyGain);
      heavyGain.connect(ctx.destination);

      filter.frequency.setValueAtTime(850, now);
      filter.Q.setValueAtTime(2, now);
      gainNoise.gain.setValueAtTime(0.55, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      osc.start(now);
      osc.stop(now + 0.32);
      heavyOsc.start(now);
      heavyOsc.stop(now + 0.32);
      noiseNode.start(now);
      noiseNode.stop(now + 0.32);

    } else if (weaponId === 5) {
      // RPG Launcher: heavy metallic initial launch whoosh
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
      gainOsc.gain.setValueAtTime(0.3, now);
      gainOsc.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      filter.frequency.setValueAtTime(500, now);
      filter.Q.setValueAtTime(1.5, now);
      gainNoise.gain.setValueAtTime(0.45, now);
      gainNoise.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.4);
      noiseNode.start(now);
      noiseNode.stop(now + 0.4);
    }
  }

  // Synthesize realistic tactical grass/dirt footsteps
  playFootstep() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Use a very rapid bandpass-filtered noise burst for crunchy footsteps
    const noiseBuffer = this.createNoiseBuffer();
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(350 + Math.random() * 150, now); // randomized pitch for natural pacing
    filter.Q.setValueAtTime(3.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.08);
  }

  // Synthesize realistic player vocal grunt + physical impact thump
  playDamage() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Low frequency physical meat impact thump
    const impact = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impact.type = "triangle";
    impact.frequency.setValueAtTime(140, now);
    impact.frequency.linearRampToValueAtTime(45, now + 0.15);
    impactGain.gain.setValueAtTime(0.35, now);
    impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    impact.connect(impactGain);
    impactGain.connect(ctx.destination);

    // 2. Resonant bandpass-filtered noise simulating a human throat pain vocal grunt
    const noiseBuffer = this.createNoiseBuffer();
    const gruntNode = ctx.createBufferSource();
    gruntNode.buffer = noiseBuffer;

    const throatFilter = ctx.createBiquadFilter();
    throatFilter.type = "bandpass";
    throatFilter.frequency.setValueAtTime(550, now); // low guttural formant
    throatFilter.Q.setValueAtTime(4.5, now);

    const gruntGain = ctx.createGain();
    gruntGain.gain.setValueAtTime(0.18, now);
    gruntGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    gruntNode.connect(throatFilter);
    throatFilter.connect(gruntGain);
    gruntGain.connect(ctx.destination);

    impact.start(now);
    impact.stop(now + 0.22);
    gruntNode.start(now);
    gruntNode.stop(now + 0.22);
  }

  // Synthesize major tactical explosion: massive shockwave rumble and crackling noise
  playExplosion() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Heavy low-frequency physical shockwave rumble
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(160, now);
    rumble.frequency.exponentialRampToValueAtTime(12, now + 0.85);
    rumbleGain.gain.setValueAtTime(0.65, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    rumble.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);

    // 2. High pressure explosive crackle burst
    const noiseBuffer = this.createNoiseBuffer();
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.7);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    rumble.start(now);
    rumble.stop(now + 0.85);
    noiseNode.start(now);
    noiseNode.stop(now + 0.85);
  }

  // Synthesize victorious military fanfare notes
  playWinFanfare() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const playNote = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    playNote(523.25, now, 0.18); // C5
    playNote(659.25, now + 0.18, 0.18); // E5
    playNote(783.99, now + 0.36, 0.18); // G5
    playNote(1046.50, now + 0.54, 0.45); // C6
  }

  // Synthesize dramatic mission failure notes
  playLoseFanfare() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const playNote = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    playNote(392.00, now, 0.22); // G4
    playNote(349.23, now + 0.22, 0.22); // F4
    playNote(311.13, now + 0.44, 0.22); // Eb4
    playNote(261.63, now + 0.66, 0.6); // C4
  }

  // Synthesize generic hydraulic door movement sound
  playDoor() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.3);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Generates 1 second of high quality white noise
  createNoiseBuffer() {
    if (!this.ctx) throw new Error("AudioContext not initialized");
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

const AudioEngine = new AudioEngineClass();
if (typeof window !== "undefined") {
  window.AudioEngine = AudioEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AudioEngine };
}