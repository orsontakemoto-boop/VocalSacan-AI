
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `
Você é um especialista sênior em fonoaudiologia, acústica e análise espectral.
Sua tarefa é analisar o áudio fornecido e os **DADOS TÉCNICOS MEDIDOS** para gerar um laudo detalhado.

ESTRUTURA DO RELATÓRIO:

1.  **📊 Análise Quantitativa (Tabela)**:
    *   Crie uma pequena tabela ou lista Markdown com os valores medidos de Pitch (Frequência Fundamental), F1 e F2.
    *   Compare esses valores com a média esperada para vozes adultas (masculinas ou femininas, deduza pelo pitch).
    *   Explique brevemente o que F1 (abertura da boca) e F2 (posição da língua) indicam neste caso específico.

2.  **🗣️ Qualidade Vocal (Subjetiva)**:
    *   Descreva o timbre, estabilidade e ressonância.
    *   A voz apresenta soprosidade, rouquidão, tensão ou tremor?

3.  **🎯 Conclusão e Dicas**:
    *   Forneça 2 exercícios práticos baseados na análise (ex: se F1 está baixo, sugerir abrir mais a boca).

Seja profissional, científico, mas acessível. Use Markdown para formatação rica.
`;

interface AnalysisMetrics {
  avgPitch: number;
  avgF1: number;
  avgF2: number;
}

export const analyzeAudioWithGemini = async (audioBlob: Blob, metrics: AnalysisMetrics): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });
    
    const base64Data = await blobToBase64(audioBlob);

    const metricsText = `
    DADOS MEDIDOS PELO ALGORITMO (Use estes números na sua análise):
    - Frequência Fundamental Média (Pitch/F0): ${Math.round(metrics.avgPitch)} Hz
    - Formante 1 Médio (F1): ${Math.round(metrics.avgF1)} Hz
    - Formante 2 Médio (F2): ${Math.round(metrics.avgF2)} Hz
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type,
              data: base64Data
            }
          },
          {
            text: `Analise este áudio de teste de vogal sustentada. ${metricsText}`
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      }
    });

    return response.text || "Não foi possível gerar uma análise.";

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API ou tente novamente.";
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
