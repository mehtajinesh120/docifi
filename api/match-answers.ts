import { getGeminiClient, generateWithRetry } from "./_lib/gemini.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { questions, images } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Questions array is required and cannot be empty." });
    }
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Images array is required and cannot be empty." });
    }

    const ai = getGeminiClient();

    // Process images in batches of up to 6 for fast execution and payload safety
    const BATCH_SIZE = 6;
    const allMatches: Array<{
      imageId: string;
      questionId: string | null;
      confidence: number;
      rationale: string;
    }> = [];

    const questionsSummary = questions
      .map((q: any) => `[Question ID: ${q.id}] Number: ${q.number} | Question: ${q.question}`)
      .join("\n");

    const batches: Array<any[]> = [];
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      batches.push(images.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch, batchIdx) => {
      const parts: any[] = [];

      parts.push({
        text: `You are an AI assistant in "Docify by JineshMehta".
Match student screenshots of answers with their corresponding assignment questions.
Screenshots may contain source code (C, C++, Java, Python, HTML/CSS, SQL, Assembly, etc.), compiler outputs, terminal execution outputs, graphs, circuit diagrams, or calculations.

Questions List:
${questionsSummary}

Analyze the following ${batch.length} image(s). For each image:
1. Examine code, keywords, function names, or outputs visible.
2. Determine which Question ID it corresponds to.
3. If an image does not clearly belong to any question, assign questionId: null.
4. Give a confidence rating (0.0 to 1.0) and a concise rationale.

Output format strictly JSON:
{
  "matches": [
    {
      "imageId": "the image id",
      "questionId": "matching question id or null",
      "confidence": 0.95,
      "rationale": "Brief reason for matching"
    }
  ]
}`,
      });

      batch.forEach((img: any) => {
        const cleanBase64 = img.base64.replace(/^data:[^;]+;base64,/, "");
        const mimeType = img.mimeType || "image/png";
        parts.push({
          text: `--- IMAGE START: ID="${img.id}", Filename="${img.name || "screenshot"}" ---`,
        });
        parts.push({
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        });
      });

      try {
        const response = await generateWithRetry(ai, {
          contents: { parts },
          config: {
            responseMimeType: "application/json",
          },
        });

        const raw = response.text || "{}";
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        return Array.isArray(parsed?.matches) ? parsed.matches : [];
      } catch (batchErr: any) {
        console.warn(`Batch ${batchIdx + 1} matching error:`, batchErr?.message);
        return [];
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((matches) => {
      allMatches.push(...matches);
    });

    // Ensure every image has an entry
    const matchedImageIds = new Set(allMatches.map((m) => m.imageId));
    images.forEach((img: any) => {
      if (!matchedImageIds.has(img.id)) {
        allMatches.push({
          imageId: img.id,
          questionId: null,
          confidence: 0,
          rationale: "Unassigned",
        });
      }
    });

    return res.status(200).json({ matches: allMatches });
  } catch (error: any) {
    console.error("Error in /api/match-answers:", error);
    return res.status(500).json({
      error: error?.message || "Failed to analyze and match screenshots with questions.",
    });
  }
}
