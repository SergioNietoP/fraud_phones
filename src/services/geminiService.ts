import { GoogleGenAI, Type } from "@google/genai";
import { PhoneLookup } from "./firebaseService";

let ai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is missing');
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export async function lookupPhoneNumber(phone: string): Promise<Omit<PhoneLookup, "createdAt">> {
  const genAI = getGenAI();
  const prompt = `Research the phone number "${phone}" across the web. Look for reports of spam, scam, commercial usage, or business ownership. 

Return your findings in JSON format with exactly these fields:
- "riskScore": an integer from 0 to 100 where 100 means highly likely to be a scam/fraud.
- "commercialUsage": true/false if it's used for business/marketing.
- "possibleCompany": string, the name of the company if found, or "Unknown".
- "purpose": string, one-sentence description of what this number is used for (e.g. "Telemarketing", "Customer Service", "Unknown scam").
- "summary": string, a short 2-3 sentence paragraph summarizing public reports and findings.`;

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
         type: Type.OBJECT,
         properties: {
             riskScore: { type: Type.NUMBER },
             commercialUsage: { type: Type.BOOLEAN },
             possibleCompany: { type: Type.STRING },
             purpose: { type: Type.STRING },
             summary: { type: Type.STRING }
         },
         required: ["riskScore", "commercialUsage", "possibleCompany", "purpose", "summary"]
      }
    }
  });

  const text = response.text || "{}";
  const data = JSON.parse(text);

  return {
    phone,
    ...data
  };
}
