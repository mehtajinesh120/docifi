import extractQuestionsHandler from "./extract-questions.js";
import extractImgbbHandler from "./extract-imgbb.js";
import matchAnswersHandler from "./match-answers.js";
import healthHandler from "./health.js";
import systemStatusHandler from "./system/status.js";
import maintenanceHandler from "./admin/maintenance.js";

export default async function handler(req: any, res: any) {
  const url = (req.url || "").split("?")[0];

  if (url.endsWith("/extract-questions") || url.includes("extract-questions")) {
    return extractQuestionsHandler(req, res);
  }
  if (url.endsWith("/extract-imgbb") || url.includes("extract-imgbb")) {
    return extractImgbbHandler(req, res);
  }
  if (url.endsWith("/match-answers") || url.includes("match-answers")) {
    return matchAnswersHandler(req, res);
  }
  if (url.endsWith("/health") || url.includes("health")) {
    return healthHandler(req, res);
  }
  if (url.endsWith("/status") || url.includes("system/status")) {
    return systemStatusHandler(req, res);
  }
  if (url.endsWith("/maintenance") || url.includes("admin/maintenance")) {
    return maintenanceHandler(req, res);
  }

  return res.status(200).json({
    status: "ok",
    message: "Docify by JineshMehta API Service",
    timestamp: new Date().toISOString(),
  });
}
