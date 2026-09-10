import { systemSettings } from "./_lib/system.js";

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({
    status: "ok",
    service: "Docify by JineshMehta",
    maintenance: systemSettings.maintenance,
  });
}
