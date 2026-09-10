import { systemSettings } from "../_lib/system.js";

export default function handler(req: any, res: any) {
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
  const { maintenance, message, estimatedTime } = body;

  if (typeof maintenance === "boolean") {
    systemSettings.maintenance = maintenance;
  }
  if (message && typeof message === "string") {
    systemSettings.message = message.trim();
  }
  if (estimatedTime && typeof estimatedTime === "string") {
    systemSettings.estimatedTime = estimatedTime.trim();
  }
  systemSettings.updatedAt = new Date().toISOString();

  return res.status(200).json({
    success: true,
    systemSettings,
  });
}
