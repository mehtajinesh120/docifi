import { extractImgbbImages } from "./_lib/imgbb.js";

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
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "urls must be a non-empty array of strings." });
    }

    const result = await extractImgbbImages(urls);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in /api/extract-imgbb handler:", error);
    return res.status(500).json({
      error: error?.message || "Failed to extract images from ImgBB links.",
    });
  }
}
