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

    // Process images in small batches (up to 4) sequentially for payload safety and API stability
    const BATCH_SIZE = 4;
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

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
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
        if (!img || !img.base64) return;
        const cleanBase64 = String(img.base64).replace(/^data:[^;]+;base64,/, "");
        const mimeType = img.mimeType || "image/jpeg";
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

        const batchMatches = Array.isArray(parsed?.matches) ? parsed.matches : [];
        allMatches.push(...batchMatches);
      } catch (batchErr: any) {
        console.warn(`Batch ${batchIdx + 1} matching warning:`, batchErr?.message);
        // Fallback for this batch: assign sequentially or by filename pattern
        batch.forEach((img: any, idx: number) => {
          const overallIndex = batchIdx * BATCH_SIZE + idx;
          const assignedQ = questions[overallIndex % questions.length];
          allMatches.push({
            imageId: img.id,
            questionId: assignedQ ? assignedQ.id : null,
            confidence: 0.6,
            rationale: "Assigned sequentially (manual review recommended)",
          });
        });
      }
    }

    // Ensure every image has an entry
    const matchedImageIds = new Set(allMatches.map((m) => m.imageId));
    images.forEach((img: any, idx: number) => {
      if (!matchedImageIds.has(img.id)) {
        const fallbackQ = questions[idx % questions.length];
        allMatches.push({
          imageId: img.id,
          questionId: fallbackQ ? fallbackQ.id : null,
          confidence: 0.5,
          rationale: "Assigned in document sequence",
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
