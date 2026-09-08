import { getGeminiClient, generateWithRetry, fallbackTextQuestionParser } from "./_lib/gemini.js";

export default async function handler(req: any, res: any) {
  // Allow CORS if needed
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { text, fileData, mimeType, fileName } = body;

  if (!text && !fileData) {
    return res.status(400).json({ error: "Please provide question text or upload a document." });
  }

  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are an expert academic document parser for an application called "Docify by JineshMehta" powered by JinAI.
Analyze the provided document/image/text and extract ONLY the actual questions, tasks, exercises, or assignment problems.

Instructions:
1. Ignore unrelated headers, submission instructions, due dates, instructor details, or grading rubrics.
2. Determine or infer a clean, concise topic title.
3. Extract each question cleanly, maintaining its original numbering.
4. Do NOT append any hints or [Expected: ...] tags into the question text.
5. Format output strictly as valid JSON:
{
  "topic": "Concise Topic Name",
  "questions": [
    {
      "id": "q1",
      "number": "1",
      "question": "Full clear text of the question or task"
    }
  ]
}`;

    let contents: any;
    if (fileData && mimeType) {
      const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Extract all questions and the topic from this file (${fileName || "document"}). Return valid JSON only.`,
          },
        ],
      };
    } else {
      contents = {
        parts: [
          {
            text: `Assignment content:\n\n${text}\n\nExtract all questions and the topic title. Return valid JSON only.`,
          },
        ],
      };
    }

    const response = await generateWithRetry(ai, {
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error("Invalid structured JSON returned by JinAI.");
      }
    }

    const questions = (parsedData.questions || []).map((q: any, idx: number) => ({
      id: q.id || `q${idx + 1}`,
      number: q.number || String(idx + 1),
      question: (q.question || String(q)).replace(/\[\s*Expected:[\s\S]*?\]/gi, "").trim(),
    }));

    return res.status(200).json({
      topic: parsedData.topic || "Assignment",
      questions,
    });
  } catch (error: any) {
    console.warn("AI extraction warning:", error?.message);

    // If student provided raw text, fallback to rule-based parser so they are never blocked
    if (text && typeof text === "string" && text.trim().length > 0) {
      console.log("Using rule-based parser fallback for questions.");
      const fallbackResult = fallbackTextQuestionParser(text);
      return res.status(200).json(fallbackResult);
    }

    return res.status(500).json({
      error: error?.message || "Failed to extract questions. Please check your document or paste text directly.",
    });
  }
}
