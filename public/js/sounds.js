// Sound system using Web Audio API - no external files needed
class SoundSystem {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.log('Web Audio not available');
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  playTone(frequency, duration, type = 'sine', volume = 0.15) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration, volume = 0.08) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.value = volume;
    source.start();
  }

  // Wood piece on wood board sound
  move() {
    this.playNoise(0.08, 0.12);
    this.playTone(800, 0.05, 'sine', 0.06);
    setTimeout(() => this.playTone(400, 0.04, 'sine', 0.03), 30);
  }

  // Capture - slightly more dramatic
  capture() {
    this.playNoise(0.12, 0.18);
    this.playTone(600, 0.08, 'sine', 0.08);
    this.playTone(300, 0.06, 'triangle', 0.06);
    setTimeout(() => this.playNoise(0.06, 0.08), 60);
  }

  // Check sound
  check() {
    this.playTone(880, 0.15, 'sine', 0.12);
    setTimeout(() => this.playTone(660, 0.2, 'sine', 0.1), 100);
  }

  // Checkmate / game over
  gameOver() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.1), i * 150);
    });
  }

  // Castle sound
  castle() {
    this.move();
    setTimeout(() => this.move(), 150);
  }

  // Illegal move / error
  illegal() {
    this.playTone(200, 0.15, 'square', 0.08);
  }

  // New game
  newGame() {
    this.playTone(523, 0.15, 'sine', 0.08);
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.1), 120);
  }

  // Notification
  notify() {
    this.playTone(660, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(880, 0.15, 'sine', 0.1), 100);
  }
}

const sound = new SoundSystem();
