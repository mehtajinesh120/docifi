import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client with provided API key or environment variable
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Fallback across active modern Gemini models
export async function generateWithRetry(ai: GoogleGenAI, params: any, retries = 2): Promise<any> {
  const models = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash"];
  let lastError: any;

  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await ai.models.generateContent({
          ...params,
          model,
        });
        return res;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "");
        const isTransient =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("429") ||
          msg.includes("ResourceExhausted");
        if (isTransient && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

// Fallback rule-based parser for text questions when offline or API limit reached
export function fallbackTextQuestionParser(rawText: string) {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: any[] = [];
  let currentQ: { number: string; question: string } | null = null;

  for (const line of lines) {
    const numMatch = line.match(/^([0-9]+|[a-zA-Z]|\bq[0-9]+\b|\btask\s*[0-9]+)[\.\:\)\-]\s*(.*)/i);
    if (numMatch) {
      if (currentQ) questions.push({ id: `q${questions.length + 1}`, ...currentQ });
      currentQ = { number: numMatch[1], question: numMatch[2] };
    } else if (currentQ) {
      currentQ.question += " " + line;
    } else {
      currentQ = { number: String(questions.length + 1), question: line };
    }
  }
  if (currentQ) questions.push({ id: `q${questions.length + 1}`, ...currentQ });

  return {
    topic: "Assignment",
    questions: questions.length > 0 ? questions : [{ id: "q1", number: "1", question: rawText }],
  };
}
