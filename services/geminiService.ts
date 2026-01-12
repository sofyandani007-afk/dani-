
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-2.5-flash-image';

export const generateSundaImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  // Always use a new instance and strictly follow the initialization pattern.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: `Hyper-realistic, high detail, 4k, daytime lighting: ${prompt}. Authentic Sundanese atmosphere, West Java rural vibes.`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data received from Gemini.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const editSundaImage = async (base64Image: string, editPrompt: string) => {
  // Always use a new instance and strictly follow the initialization pattern.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract mime type and data from data URL
  const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image format.");
  
  const mimeType = match[1];
  const data = match[2];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data,
              mimeType
            }
          },
          {
            text: `Edit this image: ${editPrompt}. Maintain hyper-realistic Sundanese rural aesthetic.`
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image data received from Gemini.");
  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw error;
  }
};
