
export interface AudioMetrics {
  pitch: number; // Fundamental frequency in Hz
  volume: number; // RMS amplitude in dB
  clarity: number; // Zero-crossing rate or spectral flatness
  f1?: number; // Primeiro Formante (abertura da boca)
  f2?: number; // Segundo Formante (posição da língua)
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  GUIDING = 'GUIDING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  text: string;
  metrics: {
    averagePitch?: number;
    averageVolume?: number;
  };
}
