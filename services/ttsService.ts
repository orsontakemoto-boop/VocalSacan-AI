
export interface SpeechSegment {
  text: string;
  rate?: number; // 1.0 é normal, 0.5 é metade da velocidade
  pitch?: number; // 1.0 é normal
  volume?: number;
}

const getFemalePtVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
  const ptVoices = voices.filter(voice => voice.lang.includes('pt'));
  
  return ptVoices.find(v => v.name.includes('Google Português')) || // Voz de alta qualidade do Chrome
         ptVoices.find(v => v.name.includes('Luciana')) || // iOS / Mac
         ptVoices.find(v => v.name.includes('Joana')) || 
         ptVoices.find(v => v.name.includes('Maria')) ||
         ptVoices.find(v => v.name.toLowerCase().includes('female')) ||
         ptVoices[0];
};

export const speakInstructions = (text: string, rate: number = 0.9, pitch: number = 1.0): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Navegador não suporta TTS");
      resolve();
      return;
    }

    const synth = window.speechSynthesis;
    // Não cancelamos aqui para permitir sequenciamento externo se necessário, 
    // mas a função speakSequence gerencia isso.

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = synth.getVoices();
    const selectedVoice = getFemalePtVoice(voices);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (e) => {
      console.error("Erro no TTS", e);
      resolve();
    };

    synth.speak(utterance);
  });
};

export const speakSequence = async (
  segments: SpeechSegment[], 
  onSegmentStart?: (text: string) => void
): Promise<void> => {
  if (!('speechSynthesis' in window)) return;
  
  window.speechSynthesis.cancel(); // Limpa a fila antes de começar a sequência

  // Pequeno delay para garantir que o cancelamento processou
  await new Promise(r => setTimeout(r, 50));

  for (const segment of segments) {
    if (onSegmentStart) {
      onSegmentStart(segment.text);
    }

    await speakInstructions(
      segment.text, 
      segment.rate || 0.9, 
      segment.pitch || 1.0
    );
    // Pequena pausa entre segmentos para naturalidade
    await new Promise(r => setTimeout(r, 100));
  }
};

// Força o carregamento das vozes
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
}
