import JSZip from "jszip";
import { AnswerImage } from "../types";

// Resize large image in client browser canvas to optimize network payload and API speed
export async function optimizeImage(
  dataUrl: string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.88
): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || 800;
      let height = img.naturalHeight || 600;

      if (width <= maxWidth && height <= maxHeight) {
        return resolve({ base64: dataUrl, width, height });
      }

      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((maxHeight / height) * width);
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ base64: dataUrl, width, height });

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const resizedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ base64: resizedDataUrl, width, height });
    };
    img.onerror = () => {
      resolve({ base64: dataUrl, width: 800, height: 600 });
    };
    img.src = dataUrl;
  });
}

// Convert File to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Extract images from a Zip file (handles 1-40+ images easily)
export async function extractImagesFromZip(zipFile: File): Promise<AnswerImage[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  const images: AnswerImage[] = [];

  const imageRegex = /\.(png|jpe?g|webp|bmp|gif)$/i;

  const entries = Object.keys(loadedZip.files).filter((filename) => {
    const file = loadedZip.files[filename];
    return !file.dir && !filename.startsWith("__MACOSX/") && imageRegex.test(filename);
  });

  // Sort files naturally (e.g. img1, img2, img10 or question1, question2)
  entries.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

  for (let i = 0; i < entries.length; i++) {
    const filename = entries[i];
    const zipEntry = loadedZip.files[filename];
    const blob = await zipEntry.async("blob");
    const mimeType = blob.type || (filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

    const rawBase64 = await fileToBase64(new File([blob], filename, { type: mimeType }));
    const { base64, width, height } = await optimizeImage(rawBase64);

    const displayName = filename.split("/").pop() || filename;

    images.push({
      id: `zip_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      name: displayName,
      source: "zip",
      base64,
      mimeType,
      size: blob.size,
      width,
      height,
    });
  }

  return images;
}

// Parse text to extract ImgBB links or image URLs with high reliability
export function parseImgbbLinks(text: string): string[] {
  if (!text) return [];
  // Match any http/https URL anywhere in the pasted text (handles newlines, spaces, bullets, markdown, numbers)
  const urlRegex = /https?:\/\/[^\s"'<>,)\]]+/gi;
  const matches = text.match(urlRegex) || [];

  // Clean up any trailing punctuation (periods, commas, semicolons, brackets, quotes)
  const cleaned = matches
    .map((url) => url.replace(/[.,;:!?'")\]]+$/, "").trim())
    .filter((url) => url.length > 8);

  return Array.from(new Set(cleaned));
}

// Format bytes to human-readable string
export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Local rule-based question parser fallback for offline or network issues
export function parseQuestionsLocally(rawText: string): { topic: string; questions: Array<{ id: string; number: string; question: string }> } {
  if (!rawText || !rawText.trim()) {
    return { topic: "Assignment", questions: [] };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: Array<{ id: string; number: string; question: string }> = [];
  let currentQ: { number: string; question: string } | null = null;
  let topic = "Assignment";

  // Check if first line looks like a title/header
  let startIndex = 0;
  if (
    lines.length > 1 &&
    !lines[0].match(/^[0-9]+[\.\:\)\-]/) &&
    !lines[0].toLowerCase().startsWith("question") &&
    !lines[0].toLowerCase().startsWith("task")
  ) {
    topic = lines[0].replace(/^(topic|assignment|practical|lab\s*[0-9]*):?\s*/i, "").trim() || "Assignment";
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const numMatch = line.match(/^([0-9]+|[a-zA-Z]|\bq[0-9]+\b|\btask\s*[0-9]+)[\.\:\)\-]\s*(.*)/i);
    if (numMatch) {
      if (currentQ) {
        questions.push({ id: `q${questions.length + 1}`, ...currentQ });
      }
      currentQ = { number: numMatch[1], question: numMatch[2] || line };
    } else if (currentQ) {
      currentQ.question += " " + line;
    } else {
      currentQ = { number: String(questions.length + 1), question: line };
    }
  }

  if (currentQ) {
    questions.push({ id: `q${questions.length + 1}`, ...currentQ });
  }

  return {
    topic,
    questions: questions.length > 0 ? questions : [{ id: "q1", number: "1", question: rawText.trim() }],
  };
}
