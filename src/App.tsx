import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { QuestionInput } from "./components/QuestionInput";
import { AnswerImagesInput } from "./components/AnswerImagesInput";
import { ReviewBoard } from "./components/ReviewBoard";
import { ExportSection } from "./components/ExportSection";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import { DeploymentGuideModal } from "./components/DeploymentGuideModal";
import { MaintenancePage } from "./components/MaintenancePage";
import { AdminPanel } from "./components/AdminPanel";
import { Question, AnswerImage } from "./types";
import { optimizeImage } from "./utils/fileHelpers";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function App() {
  // 1. Theme state: dark / light
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("docify_theme");
      if (saved === "dark" || saved === "light") return saved;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("docify_theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // 2. Routing state: "app" vs "control" (Admin Panel at /control)
  const getInitialRoute = (): "app" | "control" => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        path === "/control" ||
        path.endsWith("/control") ||
        hash === "#/control" ||
        hash === "#control" ||
        search.includes("control")
      ) {
        return "control";
      }
    }
    return "app";
  };

  const [route, setRoute] = useState<"app" | "control">(getInitialRoute);

  const navigateTo = (newRoute: "app" | "control") => {
    setRoute(newRoute);
    if (typeof window !== "undefined") {
      const targetUrl = newRoute === "control" ? "/control" : "/";
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, "", targetUrl);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getInitialRoute());
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  // 3. Maintenance mode state
  const [maintenance, setMaintenance] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("docify_maintenance") === "true";
    }
    return false;
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Docify by JineshMehta is currently undergoing scheduled updates. Please check back shortly!"
  );
  const [maintenanceEta, setMaintenanceEta] = useState("15 minutes");

  // Fetch live system status from backend
  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/system/status");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.maintenance === "boolean") {
          setMaintenance(data.maintenance);
          localStorage.setItem("docify_maintenance", String(data.maintenance));
        }
        if (data.message) setMaintenanceMessage(data.message);
        if (data.estimatedTime) setMaintenanceEta(data.estimatedTime);
      }
    } catch {
      // Offline fallback: rely on localStorage
    }
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    // Poll every 10 seconds to keep clients in sync with admin maintenance status
    const interval = setInterval(fetchSystemStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchSystemStatus]);

  // Admin updates maintenance mode
  const handleUpdateMaintenance = async (
    nextMaintenance: boolean,
    nextMessage: string,
    nextEta: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance: nextMaintenance,
          message: nextMessage,
          estimatedTime: nextEta,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update maintenance settings");
      }
      setMaintenance(nextMaintenance);
      setMaintenanceMessage(nextMessage);
      setMaintenanceEta(nextEta);
      localStorage.setItem("docify_maintenance", String(nextMaintenance));
      return true;
    } catch (err: any) {
      alert("Error saving settings: " + err.message);
      return false;
    }
  };

  // 4. Modal states
  const [isDeploymentGuideOpen, setIsDeploymentGuideOpen] = useState(false);

  // 5. Inputs state
  const [questionText, setQuestionText] = useState("");
  const [questionFile, setQuestionFile] = useState<{
    name: string;
    size: number;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [images, setImages] = useState<AnswerImage[]>([]);

  // 6. Extracted / Processed state
  const [topicName, setTopicName] = useState("Assignment Lab");
  const [questions, setQuestions] = useState<Question[]>([]);

  // 7. App UI state
  const [currentView, setCurrentView] = useState<"inputs" | "review" | "export">("inputs");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<AnswerImage | null>(null);

  // Reset workspace
  const handleReset = () => {
    if (confirm("Reset everything and start fresh?")) {
      setQuestionText("");
      setQuestionFile(null);
      setImages([]);
      setTopicName("Assignment Lab");
      setQuestions([]);
      setCurrentView("inputs");
      setErrorMessage(null);
    }
  };

  // Prepare downscaled thumbnails before sending to JinAI multimodal API
  const prepareThumbnailsForAiMatching = async (imgs: AnswerImage[]) => {
    return Promise.all(
      imgs.map(async (img) => {
        try {
          const { base64 } = await optimizeImage(img.base64, 900, 900, 0.72);
          return {
            id: img.id,
            name: img.name,
            base64,
            mimeType: "image/jpeg",
          };
        } catch {
          return {
            id: img.id,
            name: img.name,
            base64: img.base64,
            mimeType: img.mimeType,
          };
        }
      })
    );
  };

  // Run JinAI processing pipeline
  const handleRunProcessing = async () => {
    if (!questionText.trim() && !questionFile) {
      setErrorMessage("Please upload an assignment document (PDF/Image) or paste question text in Step 1.");
      return;
    }
    if (images.length === 0) {
      setErrorMessage("Please upload at least one answer screenshot (Zip, Photos, or ImgBB links) in Step 2.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus("Step 1/2: Extracting questions & topic with JinAI...");

    try {
      // 1. Extract questions and topic
      let extractedTopic = topicName;
      let extractedQuestions: Question[] = [];

      const extractRes = await fetch("/api/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: questionText,
          fileData: questionFile?.base64,
          mimeType: questionFile?.mimeType,
          fileName: questionFile?.name,
        }),
      });

      let extractData: any = {};
      const extractText = await extractRes.text();
      try {
        extractData = JSON.parse(extractText);
      } catch {
        throw new Error(
          extractRes.status >= 500
            ? `Server error (${extractRes.status}): Serverless function failed to respond with valid JSON.`
            : `Failed to parse question extraction response: ${extractText.slice(0, 100)}`
        );
      }

      if (!extractRes.ok) {
        throw new Error(extractData.error || "Failed to extract questions.");
      }

      extractedTopic = extractData.topic || "Assignment";
      extractedQuestions = extractData.questions || [];

      if (extractedQuestions.length === 0) {
        throw new Error("No distinct questions were detected in the provided document.");
      }

      setTopicName(extractedTopic);
      setQuestions(extractedQuestions);

      // 2. Match answer screenshots to questions
      setProcessingStatus(`Step 2/2: JinAI Vision matching ${images.length} screenshot(s) with ${extractedQuestions.length} question(s)...`);

      const optimizedThumbs = await prepareThumbnailsForAiMatching(images);

      const matchRes = await fetch("/api/match-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: extractedQuestions,
          images: optimizedThumbs,
        }),
      });

      let matchData: any = {};
      const matchText = await matchRes.text();
      try {
        matchData = JSON.parse(matchText);
      } catch {
        throw new Error(
          matchRes.status >= 500
            ? `Server error (${matchRes.status}): Screenshot matching service returned an error.`
            : `Failed to parse matching response: ${matchText.slice(0, 100)}`
        );
      }

      if (!matchRes.ok) {
        throw new Error(matchData.error || "Failed to match screenshots.");
      }

      const matchMap = new Map<string, { questionId: string | null; confidence: number; rationale: string }>();
      (matchData.matches || []).forEach((m: any) => {
        matchMap.set(m.imageId, {
          questionId: m.questionId,
          confidence: m.confidence,
          rationale: m.rationale,
        });
      });

      const updatedImages = images.map((img) => {
        const m = matchMap.get(img.id);
        return {
          ...img,
          matchedQuestionId: m ? m.questionId : null,
          confidence: m ? m.confidence : undefined,
          rationale: m ? m.rationale : undefined,
        };
      });

      setImages(updatedImages);
      setCurrentView("review");
    } catch (err: any) {
      console.error("Processing pipeline error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during processing.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Re-run JinAI matching
  const handleReMatchAI = async () => {
    if (questions.length === 0 || images.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus(`JinAI re-evaluating ${images.length} screenshots with ${questions.length} questions...`);

    try {
      const optimizedThumbs = await prepareThumbnailsForAiMatching(images);

      const matchRes = await fetch("/api/match-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          images: optimizedThumbs,
        }),
      });

      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || "Failed to re-match");

      const matchMap = new Map<string, { questionId: string | null; confidence: number; rationale: string }>();
      (matchData.matches || []).forEach((m: any) => {
        matchMap.set(m.imageId, {
          questionId: m.questionId,
          confidence: m.confidence,
          rationale: m.rationale,
        });
      });

      const updatedImages = images.map((img) => {
        const m = matchMap.get(img.id);
        return {
          ...img,
          matchedQuestionId: m ? m.questionId : null,
          confidence: m ? m.confidence : undefined,
          rationale: m ? m.rationale : undefined,
        };
      });

      setImages(updatedImages);
    } catch (err: any) {
      alert("Error re-matching: " + err.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const hasData = Boolean(questionText || questionFile || images.length > 0 || questions.length > 0);

  // -------------------------------------------------------------
  // ROUTE 1: ADMIN CONTROL PANEL (accessible at /control)
  // -------------------------------------------------------------
  if (route === "control") {
    return (
      <AdminPanel
        maintenance={maintenance}
        onUpdateMaintenance={handleUpdateMaintenance}
        onExitAdmin={() => navigateTo("app")}
        serverMessage={maintenanceMessage}
        serverEstimatedTime={maintenanceEta}
      />
    );
  }

  // -------------------------------------------------------------
  // MAINTENANCE MODE: When active, regular users only see maintenance screen
  // -------------------------------------------------------------
  if (maintenance) {
    return (
      <MaintenancePage
        message={maintenanceMessage}
        estimatedTime={maintenanceEta}
        onGoToAdmin={() => navigateTo("control")}
        onRefreshStatus={fetchSystemStatus}
      />
    );
  }

  // -------------------------------------------------------------
  // ROUTE 2: NORMAL DOCIFY APPLICATION (100% Mobile, Tablet & PC Compatible)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-neutral-900 dark:text-neutral-100 transition-colors duration-150">
      <Header
        onReset={handleReset}
        hasData={hasData}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDeploymentGuide={() => setIsDeploymentGuideOpen(true)}
        onGoToAdmin={() => navigateTo("control")}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Navigation Step Tabs (Touch-friendly & horizontal scrolling on mobile) */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            <button
              id="step-tab-inputs"
              type="button"
              onClick={() => setCurrentView("inputs")}
              className={`flex items-center gap-1.5 sm:gap-2 pb-2 px-2 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer min-h-[44px] ${
                currentView === "inputs"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Uploads &amp; Inputs</span>
            </button>

            <button
              id="step-tab-review"
              type="button"
              onClick={() => questions.length > 0 && setCurrentView("review")}
              disabled={questions.length === 0}
              className={`flex items-center gap-1.5 sm:gap-2 pb-2 px-2 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed ${
                currentView === "review"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] flex items-center justify-center font-bold">
                2
              </span>
              <span>Review &amp; AI Matches</span>
              {questions.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold">
                  {questions.length}
                </span>
              )}
            </button>

            <button
              id="step-tab-export"
              type="button"
              onClick={() => setCurrentView("export")}
              className={`flex items-center gap-1.5 sm:gap-2 pb-2 px-2 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer min-h-[44px] ${
                currentView === "export"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] flex items-center justify-center font-bold">
                3
              </span>
              <span>Export Word (.docx)</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-2.5 sm:gap-3 text-red-800 dark:text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Notice</p>
              <p className="text-xs mt-0.5 text-red-700 dark:text-red-300 break-words">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Processing Banner */}
        {isProcessing && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-blue-900 dark:text-blue-200 text-xs sm:text-sm shadow-xs">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-950 dark:text-blue-100 truncate">JinAI processing in progress...</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 truncate">{processingStatus}</p>
            </div>
          </div>
        )}

        {/* VIEW 1: INPUTS (Assignment Questions & Answer Screenshots) */}
        {currentView === "inputs" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
              {/* Left Column: Questions Input */}
              <QuestionInput
                questionText={questionText}
                onQuestionTextChange={setQuestionText}
                questionFile={questionFile}
                onQuestionFileChange={setQuestionFile}
                isProcessing={isProcessing}
              />

              {/* Right Column: Answer Screenshots Input */}
              <AnswerImagesInput
                images={images}
                onImagesChange={setImages}
                onPreviewImage={setPreviewImage}
                isProcessing={isProcessing}
              />
            </div>

            {/* Action Bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                  Ready to link questions with screenshots?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  JinAI Vision analyzes code solutions, 8085 assembly, terminal outputs, diagrams, and formulas.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  id="process-assignment-btn"
                  type="button"
                  onClick={handleRunProcessing}
                  disabled={isProcessing || (!questionText.trim() && !questionFile) || images.length === 0}
                  className="w-full sm:w-auto min-h-[46px] px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Matching with JinAI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract &amp; Match with JinAI</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: REVIEW BOARD */}
        {currentView === "review" && (
          <div className="space-y-4 sm:space-y-6">
            <ReviewBoard
              topicName={topicName}
              onTopicNameChange={setTopicName}
              questions={questions}
              onQuestionsChange={setQuestions}
              images={images}
              onImagesChange={setImages}
              onPreviewImage={setPreviewImage}
              onReMatchAI={handleReMatchAI}
              isProcessing={isProcessing}
            />

            {/* Bottom action to proceed to Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <button
                type="button"
                onClick={() => setCurrentView("inputs")}
                className="min-h-[44px] text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-center"
              >
                ← Back to Uploads
              </button>

              <button
                type="button"
                onClick={() => setCurrentView("export")}
                className="min-h-[44px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue to Word (.docx) Export</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: WORD EXPORT SETTINGS */}
        {currentView === "export" && (
          <div className="space-y-4 sm:space-y-6">
            <ExportSection
              topicName={topicName}
              questions={questions}
              images={images}
            />

            <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <button
                type="button"
                onClick={() => setCurrentView("review")}
                className="min-h-[44px] text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                ← Back to Review Questions
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Processing Animation Overlay */}
      <ProcessingOverlay
        isOpen={isProcessing}
        statusText={processingStatus}
        imageCount={images.length}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Free Vercel Deployment & API Guide Modal */}
      <DeploymentGuideModal
        isOpen={isDeploymentGuideOpen}
        onClose={() => setIsDeploymentGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-5 text-center text-xs text-neutral-500 dark:text-neutral-400 mt-auto bg-white/50 dark:bg-neutral-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Docify by JineshMehta</span>
            <span>• High-speed assignment to Word processor</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-400 dark:text-neutral-500 text-[11px]">
            <span>Microsoft Word (.docx), Zip, PDF, ImgBB</span>
            <span>•</span>
            <button
              onClick={() => navigateTo("control")}
              className="text-neutral-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Admin /control
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
