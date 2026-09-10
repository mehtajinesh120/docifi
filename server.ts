import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";

import extractQuestionsHandler from "./api/extract-questions.js";
import extractImgbbHandler from "./api/extract-imgbb.js";
import matchAnswersHandler from "./api/match-answers.js";
import healthHandler from "./api/health.js";
import systemStatusHandler from "./api/system/status.js";
import maintenanceHandler from "./api/admin/maintenance.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Global CORS Middleware - ensure headers are always present on all responses and preflight requests
app.use((req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Origin, Accept, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Increase limit to handle multiple base64 screenshot uploads
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Express JSON parsing & entity size error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err) {
    console.error("Middleware payload error:", err.message || err);
    res.header("Access-Control-Allow-Origin", "*");
    return res.status(err.status || 400).json({
      error: err.type === "entity.too.large"
        ? "Uploaded file or screenshots exceed allowable size limit. Please upload fewer or smaller images."
        : (err.message || "Invalid request body."),
    });
  }
  next();
});

// Anti-Cloning & Website Downloader Honeypot Defense
const CLONER_BOTS = [
  "httrack",
  "wget",
  "saveweb2zip",
  "cyotek",
  "webcopy",
  "offline explorer",
  "teleport",
  "scrapingbee",
  "sitecopy",
  "phantomjs",
  "headlesschrome",
  "html2pdf",
  "wkhtmltopdf",
  "archiver",
  "website downloader",
  "copier",
];

app.use((req: Request, res: Response, next) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const isCloner = CLONER_BOTS.some((bot) => ua.includes(bot));
  if (isCloner && !req.path.startsWith("/api/")) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>⚠️ 418 CLONE INTERCEPTED - QUANTUM TAMPER DETECTED</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <style>
          body { background: #080808; color: #10b981; font-family: monospace; padding: 40px; text-align: center; }
          .shield-box { max-width: 640px; margin: 60px auto; border: 2px dashed #ef4444; padding: 30px; border-radius: 16px; background: #0f172a; }
          h1 { color: #f43f5e; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
          pre { background: #020617; color: #38bdf8; padding: 16px; text-align: left; border-radius: 8px; font-size: 11px; overflow-x: auto; border: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="shield-box">
          <h1>⚠️ DOCIFY ANTI-CLONE PROTOCOL TRIGGERED</h1>
          <p style="color: #cbd5e1; font-size: 13px;">Docify Anti-Piracy Shield intercepted an unauthorized web mirroring &amp; cloning agent.</p>
          <pre>
[DOCIFY SHIELD: CLONE INTERCEPT REPORT]
SECURITY_STATUS: BLOCKED &amp; HONEY-CORRUPTED
INTERCEPTED_AGENT: "${ua.slice(0, 50)}"
HONEY_HASH: 0xDEADBEEF_CAFE_8085_F00D
SNAPSHOT_STATUS: PURGED &amp; REPLACED WITH ENCRYPTED ENTROPY
PIRACY_DEFENSE: ACTIVE
          </pre>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 16px;">
            To use Docify by JineshMehta, open the official website in a legitimate, modern web browser.
          </p>
        </div>
      </body>
      </html>
    `);
  }
  next();
});

// Safe async wrapper to prevent unhandled rejections from crashing the server
const safeAsync = (handler: (req: Request, res: Response) => Promise<any> | any) => {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error(`Unhandled error in API route ${req.path}:`, err);
      if (!res.headersSent) {
        res.header("Access-Control-Allow-Origin", "*");
        res.status(500).json({
          error: err?.message || "Internal server error occurred.",
        });
      }
    }
  };
};

// Mount all API endpoints
app.get("/api/health", safeAsync((req: Request, res: Response) => healthHandler(req, res)));
app.get("/api/system/status", safeAsync((req: Request, res: Response) => systemStatusHandler(req, res)));
app.post("/api/admin/maintenance", safeAsync((req: Request, res: Response) => maintenanceHandler(req, res)));
app.post("/api/extract-questions", safeAsync((req: Request, res: Response) => extractQuestionsHandler(req, res)));
app.post("/api/extract-imgbb", safeAsync((req: Request, res: Response) => extractImgbbHandler(req, res)));
app.post("/api/match-answers", safeAsync((req: Request, res: Response) => matchAnswersHandler(req, res)));

// Vite middleware setup (lazy import to prevent bundling issues on serverless platforms)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
