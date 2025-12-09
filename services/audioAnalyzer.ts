
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array | null = null;
  private bufferLength: number = 0;

  async start(): Promise<MediaStream> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.microphone = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = 2048; 
    this.analyser.smoothingTimeConstant = 0.8; // Suavização para facilitar detecção visual
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    this.microphone.connect(this.analyser);
    
    return this.stream;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.microphone = null;
    this.analyser = null;
    this.audioContext = null;
    this.stream = null;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.dataArray) return new Uint8Array(0);
    this.analyser.getByteFrequencyData(this.dataArray as any);
    return this.dataArray;
  }

  getTimeDomainData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData as any);
    return timeData;
  }

  getVolume(): number {
    const timeData = this.getTimeDomainData();
    if (timeData.length === 0) return -100;

    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const x = (timeData[i] - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const db = 20 * Math.log10(rms);
    
    return Math.max(-100, db);
  }

  getPitch(): number {
    if (!this.analyser) return 0;
    
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);
    
    const sampleRate = this.audioContext?.sampleRate || 44100;
    
    const SIZE = buffer.length;
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;
    let foundGoodCorrelation = false;
    const correlations = new Float32Array(SIZE);

    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.01) return 0;

    let lastCorrelation = 1;
    for (let offset = 0; offset < SIZE; offset++) {
      let correlation = 0;

      for (let i = 0; i < SIZE - offset; i++) {
        correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
      }
      
      correlation = 1 - (correlation / SIZE); 
      correlations[offset] = correlation; 
      
      if ((correlation > 0.9) && (correlation > lastCorrelation)) {
        foundGoodCorrelation = true;
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      } else if (foundGoodCorrelation) {
        const shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];  
        return sampleRate / (bestOffset + (8 * shift));
      }
      lastCorrelation = correlation;
    }
    
    if (bestCorrelation > 0.01) {
      return sampleRate / bestOffset;
    }
    
    return 0;
  }

  // Estimativa simplificada de Formantes (Picos no envelope espectral)
  getFormants(): { f1: number, f2: number } {
    if (!this.analyser || !this.dataArray) return { f1: 0, f2: 0 };
    
    const spectrum = this.getFrequencyData();
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binSize = sampleRate / this.analyser.fftSize;

    // Suavização simples (Moving Average) para encontrar o "envelope" e ignorar harmônicos individuais
    const envelope = new Float32Array(spectrum.length);
    const windowSize = 5; // Janela de suavização

    for (let i = 0; i < spectrum.length; i++) {
        let sum = 0;
        let count = 0;
        for (let w = -windowSize; w <= windowSize; w++) {
            if (i + w >= 0 && i + w < spectrum.length) {
                sum += spectrum[i + w];
                count++;
            }
        }
        envelope[i] = sum / count;
    }

    // Encontrar picos no envelope
    const peaks: number[] = [];
    // Começamos de um índice > 5 para ignorar o componente DC e ruídos muito graves
    for (let i = 5; i < envelope.length - 1; i++) {
        if (envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1] && envelope[i] > 30) {
            peaks.push(i * binSize * 2); // *2 é um fator de correção empírico para FFT bin size
        }
    }

    // Heurística básica para F1 (200-1000Hz) e F2 (800-2500Hz)
    let f1 = peaks.find(f => f > 250 && f < 900) || 0;
    let f2 = peaks.find(f => f > 950 && f < 2500) || 0;

    return { f1, f2 };
  }
}
