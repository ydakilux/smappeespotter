import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedPlace {
  name: string;
  context?: string;
  lat?: number;
  lng?: number;
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await ai.models.list();
    const models: string[] = [];
    for await (const m of response) {
      if (m.name && m.name.includes('flash') && !m.name.includes('embedding') && !m.name.includes('audio') && !m.name.includes('tts') && !m.name.includes('image')) {
        models.push(m.name.replace('models/', ''));
      }
    }
    return models;
  } catch (error: any) {
    console.error("Error listing Gemini models:", error);
    return ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']; // Fallback
  }
}

export async function extractLocationsFromText(text: string, model: string = 'gemini-3.5-flash'): Promise<ExtractedPlace[]> {
  const schema = {
    type: Type.ARRAY,
    description: "List of places or locations mentioned in the text that a person might want to visit.",
    items: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "The name of the place, city, or location.",
        },
        context: {
          type: Type.STRING,
          description: "Brief context on why this place was mentioned.",
        },
        lat: {
          type: Type.NUMBER,
          description: "If the text contains coordinates or a map URL, extract the precise latitude (e.g., from an '@lat,lng' part of a URL or explicit coordinates).",
        },
        lng: {
          type: Type.NUMBER,
          description: "If the text contains coordinates or a map URL, extract the precise longitude.",
        },
      },
      required: ["name"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Extract all locations/places mentioned in the following Instagram post description:\n\n${text}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2,
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as ExtractedPlace[];
      return parsed;
    }
    return [];
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Gemini API Error: " + (error.message || error.toString()));
  }
}
