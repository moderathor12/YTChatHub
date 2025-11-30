// tts-service.ts
// Bu dosyayı client/ klasörüne ekleyin

interface TTSMessage {
  text: string;
  username?: string;
}

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = false;
  private voice: SpeechSynthesisVoice | null = null;
  private rate: number = 1.2; // Biraz daha hızlı
  private pitch: number = 1.0;
  private volume: number = 0.8;
  private isReady: boolean = false;
  private isSpeaking: boolean = false;
  private queue: TTSMessage[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
    }
  }

  private initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      if (!this.synth) return;
      const voices = this.synth.getVoices();
      
      if (voices.length > 0) {
        // Türkçe sesi bul (farklı formatlarda)
        const turkishVoice = voices.find(voice => 
          voice.lang.toLowerCase().includes('tr') ||
          voice.name.toLowerCase().includes('turkish') ||
          voice.name.toLowerCase().includes('türkçe')
        );
        
        this.voice = turkishVoice || voices[0];
        this.isReady = true;
        console.log('✅ TTS Hazır. Toplam ses:', voices.length);
        console.log('🔊 Seçili ses:', this.voice?.name, '(' + this.voice?.lang + ')');
        if (!turkishVoice) {
          console.warn('⚠️ Türkçe ses bulunamadı, varsayılan ses kullanılıyor');
          console.log('📋 Mevcut sesler:', voices.map(v => v.name + ' (' + v.lang + ')').join(', '));
        }
      }
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    setTimeout(loadVoices, 100);
  }

  toggleTTS(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      this.queue = [];
    }
    console.log('🔊 TTS:', enabled ? 'Açık' : 'Kapalı');
  }

  setSettings(settings: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceName?: string;
  }) {
    if (settings.rate !== undefined) this.rate = settings.rate;
    if (settings.pitch !== undefined) this.pitch = settings.pitch;
    if (settings.volume !== undefined) this.volume = settings.volume;
    
    if (settings.voiceName && this.synth) {
      const voices = this.synth.getVoices();
      const selectedVoice = voices.find(v => v.name === settings.voiceName);
      if (selectedVoice) this.voice = selectedVoice;
    }
  }

  speak(text: string, username?: string) {
    if (!this.enabled) return;
    
    if (!text || text.trim() === '' || text === 'N/A') return;
    
    if (!this.synth || !this.isReady) {
      console.warn('⚠️ TTS henüz hazır değil');
      return;
    }

    // Kuyruğa ekle
    this.queue.push({ text, username });
    
    // Eğer konuşmuyorsak, kuyruğu işlemeye başla
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    if (!this.synth || !this.enabled) {
      this.queue = [];
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const message = this.queue.shift()!;

    try {
      // Sadece mesaj metnini seslendir, kullanıcı adı olmadan
      const fullText = message.text;
      
      // Metni kısalt
      const maxLength = 200;
      const textToSpeak = fullText.length > maxLength 
        ? fullText.substring(0, maxLength) 
        : fullText;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      
      if (this.voice) {
        utterance.voice = this.voice;
      }

      utterance.onstart = () => {
        console.log('▶️ Seslendiriliyor:', textToSpeak.substring(0, 40) + '...');
      };

      utterance.onend = () => {
        console.log('✅ Bitti');
        // Bir sonraki mesajı işle
        setTimeout(() => this.processQueue(), 100);
      };

      utterance.onerror = (event) => {
        console.error('❌ TTS Hatası:', event.error);
        // Hataya rağmen devam et
        setTimeout(() => this.processQueue(), 100);
      };

      // Konuşmayı başlat
      this.synth.speak(utterance);
      
    } catch (error) {
      console.error('❌ Seslendirme hatası:', error);
      setTimeout(() => this.processQueue(), 100);
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.queue = [];
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  ready(): boolean {
    return this.isReady;
  }

  // Kuyrukta bekleyen mesaj sayısı
  queueLength(): number {
    return this.queue.length;
  }
}

export const ttsService = new TTSService();