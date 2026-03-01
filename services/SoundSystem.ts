// @ts-nocheck

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private bgmGain: GainNode | null = null;
  private currentBgm: OscillatorNode | null = null;
  private battleMusicInterval: any = null;
  private ambientInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => this.init(), { once: true });
      window.addEventListener('keydown', () => this.init(), { once: true });
    }
  }

  private init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.15;
      this.bgmGain.connect(this.masterGain);
    }
  }

  public toggle(mute: boolean) {
    this.enabled = !mute;
    if (this.masterGain) {
        this.masterGain.gain.value = this.enabled ? 0.3 : 0;
    }
    if (!this.enabled && this.currentBgm) {
      this.stopBgm();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1, slideTo: number | null = null) {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, vol: number = 1) {
      if (!this.ctx || !this.masterGain || !this.enabled) return;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      
      noise.connect(gain);
      gain.connect(this.masterGain);
      noise.start();
  }

  // === BATTLE MUSIC ===
  public startBattleMusic() {
    this.stopBgm();
    if (!this.ctx || !this.bgmGain || !this.enabled) return;
    
    const notes = [110, 130.81, 146.83, 164.81, 196, 220]; // A2 to A3
    let noteIndex = 0;
    
    const playNote = () => {
      if (!this.ctx || !this.bgmGain || !this.enabled) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = notes[noteIndex];
      
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, this.ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(this.bgmGain);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
      
      noteIndex = (noteIndex + 1) % notes.length;
    };
    
    this.battleMusicInterval = setInterval(playNote, 500);
    playNote();
  }

  public startExplorationMusic() {
    this.stopBgm();
    if (!this.ctx || !this.bgmGain || !this.enabled) return;
    
    const melody = [261.63, 293.66, 329.63, 349.23, 392, 440]; // C4 to A4
    let noteIndex = 0;
    
    const playNote = () => {
      if (!this.ctx || !this.bgmGain || !this.enabled) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = melody[noteIndex];
      
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, this.ctx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(this.bgmGain);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 1);
      
      noteIndex = (noteIndex + 1) % melody.length;
    };
    
    this.ambientInterval = setInterval(playNote, 1200);
    playNote();
  }

  public startVictoryMusic() {
    this.stopBgm();
    if (!this.ctx || !this.bgmGain || !this.enabled) return;
    
    const fanfare = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    let delay = 0;
    
    fanfare.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.bgmGain || !this.enabled) return;
        
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc2.type = 'sine';
        osc2.frequency.value = freq * 1.5;
        
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1);
        
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.bgmGain);
        
        osc.start();
        osc2.start();
        osc.stop(this.ctx.currentTime + 1);
        osc2.stop(this.ctx.currentTime + 1);
      }, delay);
      delay += 200;
    });
  }

  public stopBgm() {
    if (this.battleMusicInterval) {
      clearInterval(this.battleMusicInterval);
      this.battleMusicInterval = null;
    }
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm = null;
    }
  }

  // === SFX PRESETS ===

  public playUiClick() {
      this.playTone(800, 'sine', 0.05, 0.5);
  }

  public playUiHover() {
      this.playTone(400, 'triangle', 0.02, 0.1);
  }

  public playUiConfirm() {
      this.playTone(600, 'sine', 0.1, 0.4);
      setTimeout(() => this.playTone(900, 'sine', 0.15, 0.3), 80);
  }

  public playUiError() {
      this.playTone(200, 'square', 0.2, 0.3);
  }

  public playStep() {
      this.playNoise(0.05, 0.15);
      this.playTone(80, 'square', 0.05, 0.08, 40);
  }

  public playAttack() {
      this.playNoise(0.15, 0.4);
      this.playTone(200, 'sawtooth', 0.15, 0.3, 80);
      setTimeout(() => this.playTone(100, 'square', 0.1, 0.2), 50);
  }

  public playHit() {
      this.playNoise(0.25, 0.5);
      this.playTone(100, 'sawtooth', 0.25, 0.4, 30);
  }

  public playMagic() {
      this.playTone(500, 'sine', 0.5, 0.25, 1000);
      setTimeout(() => this.playTone(700, 'sine', 0.5, 0.2, 1500), 100);
      setTimeout(() => this.playTone(1100, 'sine', 0.6, 0.15, 2000), 200);
  }

  public playHeal() {
      this.playTone(400, 'sine', 0.3, 0.3, 600);
      setTimeout(() => this.playTone(500, 'sine', 0.4, 0.25, 800), 150);
      setTimeout(() => this.playTone(600, 'sine', 0.5, 0.2, 1000), 300);
  }

  public playItemUse() {
      this.playTone(700, 'sine', 0.1, 0.4);
      setTimeout(() => this.playTone(900, 'triangle', 0.2, 0.3), 100);
  }

  public playCrit() {
      this.playTone(600, 'square', 0.15, 0.5, 1500);
      setTimeout(() => this.playTone(900, 'square', 0.2, 0.5, 2000), 80);
      setTimeout(() => this.playTone(1200, 'square', 0.3, 0.4, 2500), 160);
  }

  public playVictory() {
      this.startVictoryMusic();
      const now = this.ctx?.currentTime || 0;
      [0, 0.2, 0.4, 0.8].forEach((t, i) => {
          setTimeout(() => this.playTone(440 * (i+1), 'triangle', 0.4, 0.5), t * 1000);
      });
  }

  public playDefeat() {
      this.playTone(300, 'sine', 1, 0.4, 100);
      setTimeout(() => this.playTone(250, 'sine', 1, 0.3, 80), 300);
      setTimeout(() => this.playTone(200, 'sine', 1.5, 0.2, 50), 600);
  }

  public playEnemyTurn() {
      this.playTone(150, 'sawtooth', 0.3, 0.3, 80);
      setTimeout(() => this.playTone(120, 'square', 0.2, 0.2), 200);
  }

  public playPlayerTurn() {
      this.playTone(400, 'triangle', 0.2, 0.3, 600);
  }

  public playLoot() {
      this.playTone(800, 'sine', 0.1, 0.4);
      setTimeout(() => this.playTone(1000, 'sine', 0.2, 0.3), 150);
      setTimeout(() => this.playTone(1200, 'sine', 0.3, 0.25), 300);
  }

  public playLevelUp() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.3, 0.4), i * 150);
      });
  }
}

export const sfx = new SoundSystem();
