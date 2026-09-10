import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client with provided API key or environment variable
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured on server.");
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
export async function generateWithRetry(ai: GoogleGenAI, params: any, retries = 1): Promise<any> {
  // Use resilient list of active models with fallback
  const models = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-2.5-pro",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash",
  ];
  let lastError: any;

  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after 25s calling Gemini model ${model}`)), 25000)
        );
        const generatePromise = ai.models.generateContent({
          ...params,
          model,
        });
        const res = (await Promise.race([generatePromise, timeoutPromise])) as any;
        return res;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "");

        // If daily quota or resource exhausted for this model, immediately break to try next model!
        if (msg.includes("resource_exhausted") || msg.includes("Quota exceeded") || msg.includes("RESOURCE_EXHAUSTED")) {
          console.warn(`Model ${model} quota exhausted, falling back to next available model.`);
          break;
        }

        const isTransient =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("429") ||
          msg.includes("Timeout");
        if (isTransient && attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
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
