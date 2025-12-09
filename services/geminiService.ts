import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `
Você é um especialista em fonoaudiologia e engenharia de áudio. 
Sua tarefa é analisar o arquivo de áudio fornecido contendo fala humana.
Forneça uma análise concisa, estruturada e profissional cobrindo os seguintes pontos:

1.  **Características Vocais**: Descreva o timbre (ex: rouco, aveludado, estridente, anasalado, soproso).
2.  **Tonalidade e Pitch**: Classifique a voz (Grave, Médio, Agudo) e estime a estabilidade.
3.  **Dinâmica e Intensidade**: A voz varia bem o volume ou é monótona?
4.  **Emoção/Intenção**: Qual a emoção transmitida (calma, ansiosa, autoritária, hesitante)?
5.  **Recomendação Rápida**: Uma dica breve para melhoria da comunicação se aplicável.

Formate a resposta usando Markdown. Use emojis para ilustrar os pontos principais. Seja objetivo.
`;

export const analyzeAudioWithGemini = async (audioBlob: Blob): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });
    
    // Convert Blob to Base64
    const base64Data = await blobToBase64(audioBlob);

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
            text: "Analise este áudio focando nas características da voz."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.4, // Lower temperature for more analytical results
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
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};