
import { GoogleGenAI } from "@google/genai";

export const generateAdCopy = async (profession: string, keywords: string): Promise<string> => {
  try {
    // Create a new instance right before the call to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Escreva um anúncio curto, persuasivo e profissional para um site de classificados.
    Profissão: ${profession}.
    Palavras-chave/Serviços: ${keywords}.
    O tom deve ser confiável e vibrante. Máximo de 50 palavras. Não use aspas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Directly access .text property from GenerateContentResponse
    return response.text?.trim() || "Não foi possível gerar o texto no momento.";
  } catch (error) {
    console.error("Erro ao gerar anúncio com Gemini:", error);
    return "Erro ao conectar com a IA Inteligente.";
  }
};
