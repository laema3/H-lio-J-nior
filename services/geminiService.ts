
import { GoogleGenAI } from "@google/genai";

/**
 * Gera copy para o anúncio (função existente)
 */
export const generateAdCopy = async (profession: string, keywords: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Escreva um anúncio curto, persuasivo e profissional para um site de classificados.
    Profissão: ${profession}.
    Palavras-chave/Serviços: ${keywords}.
    O tom deve ser confiável e vibrante. Máximo de 50 palavras. Não use aspas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Não foi possível gerar o texto no momento.";
  } catch (error) {
    console.error("Erro ao gerar anúncio com Gemini:", error);
    return "Erro ao conectar com a IA Inteligente.";
  }
};

/**
 * Chat interativo com o Assistente Virtual do Portal
 */
export const chatWithAssistant = async (message: string, history: {role: string, parts: {text: string}[]}[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `Você é o Assistente Virtual do Portal Hélio Júnior Radialista. 
    Seu objetivo é ajudar visitantes a entenderem como anunciar no portal.
    Hélio Júnior é um comunicador respeitado e este portal é uma vitrine para empresas e profissionais.
    
    Informações Importantes:
    1. O portal oferece planos Mensais, Trimestrais e Anuais.
    2. Anunciantes ganham visibilidade e podem usar IA para criar seus anúncios.
    3. Se o usuário quiser falar com uma pessoa real ou fechar negócio, diga que ele pode clicar no botão "Falar com Humano" no topo do chat.
    4. Seja cordial, profissional e use um tom de radialista (vibrante e amigável).
    5. Mantenha as respostas curtas e objetivas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Desculpe, tive um problema técnico. Pode repetir?";
  } catch (error) {
    console.error("Erro no Chat AI:", error);
    return "Estou com dificuldades de conexão. Que tal tentar o WhatsApp direto?";
  }
};
