
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Gera copy para o anúncio ou um script de rádio
 */
export const generateAdCopy = async (profession: string, keywords: string, type: 'short' | 'radio' = 'short'): Promise<{title: string, content: string} | string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    if (type === 'short') {
      const prompt = `Crie um anúncio de impacto para um portal de classificados. 
      Profissão/Ramo: ${profession}. 
      Contexto: ${keywords}. 
      Retorne APENAS um JSON no formato: {"title": "Título chamativo", "content": "Descrição persuasiva de até 60 palavras"}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      try {
        return JSON.parse(response.text || "{}");
      } catch {
        return { title: "Novo Anúncio", content: response.text || "" };
      }
    } else {
      const prompt = `Escreva um SPOT DE RÁDIO de 30 segundos. Inclua indicações de [Trilha] e [Locutor]. Seja extremamente persuasivo. Profissão: ${profession}. Negócio: ${keywords}. Tom de rádio profissional.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text?.trim() || "Não foi possível gerar o texto no momento.";
    }
  } catch (error) {
    console.error("Erro ao gerar anúncio com Gemini:", error);
    return "Erro ao conectar com a IA Inteligente.";
  }
};

/**
 * Gera uma imagem publicitária baseada na descrição do anúncio
 */
export const generateAdImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePrompt = `Uma fotografia publicitária profissional, estilo estúdio ou ambiente realístico de alta qualidade, para: ${prompt}. Iluminação cinematográfica, foco nítido, cores vibrantes, composição limpa para anúncio.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: imagePrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Erro ao gerar imagem IA:", error);
    return undefined;
  }
};

/**
 * Gera áudio (TTS) a partir do texto do anúncio
 */
export const generateAudioTTS = async (text: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Limpar o texto de tags de rádio [Trilha] etc para o TTS ficar limpo
    const cleanText = text.replace(/\[.*?\]/g, '').trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Leia com voz de locutor de rádio profissional, vibrante e confiável: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore tem um tom firme e profissional
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Erro ao gerar áudio TTS:", error);
    return undefined;
  }
};

/**
 * Chat interativo com o Assistente Virtual
 */
export const chatWithAssistant = async (message: string, history: {role: string, parts: {text: string}[]}[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `Você é o Assistente Virtual do Portal Hélio Júnior Radialista. 
    Seu tom é de radialista: vibrante, cordial e muito amigável.
    
    Informações Importantes:
    1. Planos: Degustação (30 dias grátis), Mensal (49,90), Trimestral (129,90) e Anual (399,90).
    2. Diferencial: Locução por IA. O anunciante pode gerar o texto e ouvir como ficaria no rádio.
    3. Para suporte humano, use o botão no chat.`;

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
