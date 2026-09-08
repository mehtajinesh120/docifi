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

// Increase limit to handle multiple base64 screenshot uploads
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Mount all API endpoints
app.get("/api/health", (req: Request, res: Response) => healthHandler(req, res));
app.get("/api/system/status", (req: Request, res: Response) => systemStatusHandler(req, res));
app.post("/api/admin/maintenance", (req: Request, res: Response) => maintenanceHandler(req, res));
app.post("/api/extract-questions", (req: Request, res: Response) => extractQuestionsHandler(req, res));
app.post("/api/extract-imgbb", (req: Request, res: Response) => extractImgbbHandler(req, res));
app.post("/api/match-answers", (req: Request, res: Response) => matchAnswersHandler(req, res));

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
