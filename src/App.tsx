import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { QuestionInput } from "./components/QuestionInput";
import { AnswerImagesInput } from "./components/AnswerImagesInput";
import { ReviewBoard } from "./components/ReviewBoard";
import { ExportSection } from "./components/ExportSection";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import { MaintenancePage } from "./components/MaintenancePage";
import { AdminPanel } from "./components/AdminPanel";
import { AuthModal } from "./components/AuthModal";
import { UserDashboardModal } from "./components/UserDashboardModal";
import { GoogleAd } from "./components/GoogleAd";
import { Question, AnswerImage, UserProfile } from "./types";
import { optimizeImage, parseQuestionsLocally } from "./utils/fileHelpers";
import {
  getCurrentUser,
  logoutUser,
  setCurrentUser,
  checkGenerationQuota,
  getSystemConfig,
  updateSystemConfig,
  isUserApproved,
  refreshCurrentUser,
  supabase,
} from "./lib/supabase";
import { LegalPagesModal } from "./components/LegalPagesModal";
import { AccountApprovalModal } from "./components/AccountApprovalModal";
import { initSecurityShield, checkAntiClone } from "./utils/securityShield";
import { CloudflareProtection } from "./components/CloudflareProtection";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function App() {
  // Legal modal state
  const [legalModalSection, setLegalModalSection] = useState<"about" | "contact" | "privacy" | "refund" | "disclaimer" | null>(null);

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

  // 0. Security Shield: Anti-DevTools, Anti-Exploits, Anti-Cloning
  useEffect(() => {
    const cleanupSecurity = initSecurityShield({
      antiDevTools: true,
      blockContextMenu: true,
      antiClone: true,
      onExploitDetected: (reason) => {
        console.warn(`[Docify Defense]: Intercepted unauthorized tampering attempt: ${reason}`);
      },
    });

    // Run active anti-cloner honeypot test
    checkAntiClone();

    return () => {
      cleanupSecurity();
    };
  }, []);

  // Cloudflare Protection state
  const [isCloudflareVerified, setIsCloudflareVerified] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      if (path.includes("control")) return true;
      return sessionStorage.getItem("docify_cf_cleared") !== null;
    }
    return false;
  });
  const [cloudflareEnabled, setCloudflareEnabled] = useState<boolean>(true);

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

  // Fetch live system status from Supabase cloud database & backend
  const fetchSystemStatus = useCallback(async () => {
    try {
      // 1. Fetch from Supabase cloud database first (global authoritative source across all devices)
      const sysConfig = await getSystemConfig();
      setSystemConfig(sysConfig);
      if (typeof sysConfig.maintenance === "boolean") {
        setMaintenance(sysConfig.maintenance);
        localStorage.setItem("docify_maintenance", String(sysConfig.maintenance));
      }
      if (sysConfig.maintenanceMessage) setMaintenanceMessage(sysConfig.maintenanceMessage);
      if (sysConfig.maintenanceEta) setMaintenanceEta(sysConfig.maintenanceEta);
      if (typeof sysConfig.cloudflareCheckEnabled === "boolean") {
        setCloudflareEnabled(sysConfig.cloudflareCheckEnabled);
      }

      // 2. Also query backend API
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          // If server says maintenance is active, prioritize it
          if (data.maintenance === true) {
            setMaintenance(true);
            localStorage.setItem("docify_maintenance", "true");
          }
          if (data.message) setMaintenanceMessage(data.message);
          if (data.estimatedTime) setMaintenanceEta(data.estimatedTime);
        }
      } catch {
        // Backend unavailable, Supabase config already applied
      }
    } catch {
      // Offline fallback: rely on localStorage
    }
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    // Poll every 5 seconds so all clients on all devices get immediate maintenance updates
    const interval = setInterval(fetchSystemStatus, 5000);

    // Supabase Realtime channel for instant global propagation
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel("realtime_maintenance_config")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "system_config" },
            (payload: any) => {
              if (payload?.new?.key === "main_config" && payload?.new?.value) {
                const conf = payload.new.value;
                if (typeof conf.maintenance === "boolean") {
                  setMaintenance(conf.maintenance);
                  localStorage.setItem("docify_maintenance", String(conf.maintenance));
                }
                if (conf.maintenanceMessage) setMaintenanceMessage(conf.maintenanceMessage);
                if (conf.maintenanceEta) setMaintenanceEta(conf.maintenanceEta);
                if (typeof conf.cloudflareCheckEnabled === "boolean") {
                  setCloudflareEnabled(conf.cloudflareCheckEnabled);
                }
              }
            }
          )
          .subscribe();
      } catch {}
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchSystemStatus]);

  // Admin updates maintenance mode
  const handleUpdateMaintenance = async (
    nextMaintenance: boolean,
    nextMessage: string,
    nextEta: string
  ): Promise<boolean> => {
    try {
      // 1. Save to Supabase (global cloud database)
      await updateSystemConfig({
        maintenance: nextMaintenance,
        maintenanceMessage: nextMessage,
        maintenanceEta: nextEta,
      });

      // 2. Also update server memory
      try {
        await fetch("/api/admin/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maintenance: nextMaintenance,
            message: nextMessage,
            estimatedTime: nextEta,
          }),
        });
      } catch {}

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

  // 4. User Authentication & Profile states
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);

  // Authoritative user approval check based on current user profile & cloud system settings
  const userApproval = isUserApproved(currentUser, systemConfig || undefined);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUserState(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUserState(null);
    setIsDashboardModalOpen(false);
  };

  const handleUserUpdate = (updated: UserProfile) => {
    setCurrentUserState(updated);
  };

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
    if (!currentUser) {
      setAuthMode("login");
      setIsAuthModalOpen(true);
      return;
    }

    // Strict Approval Check
    const approval = isUserApproved(currentUser, systemConfig || undefined);
    if (!approval.approved) {
      setIsApprovalModalOpen(true);
      setErrorMessage("Waiting for Account Approval. contact jinesh to approve your account.");
      return;
    }

    // Strict Free Quota Check
    const quota = checkGenerationQuota(currentUser);
    if (!quota.allowed) {
      setErrorMessage(
        quota.reason ||
          `Generation limit reached. Free accounts allow ${quota.maxGenerations} generation(s) every ${quota.cooldownDays} day(s). Please upgrade or wait for quota reset.`
      );
      return;
    }

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

      try {
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
          extractData = {};
        }

        if (extractRes.ok && Array.isArray(extractData.questions) && extractData.questions.length > 0) {
          extractedTopic = extractData.topic || topicName || "Assignment";
          extractedQuestions = extractData.questions;
        } else if (questionText.trim()) {
          // If server extraction failed or returned error, fallback to local text parsing
          const localParsed = parseQuestionsLocally(questionText);
          extractedTopic = localParsed.topic || topicName || "Assignment";
          extractedQuestions = localParsed.questions;
        } else {
          throw new Error(extractData.error || "Could not extract questions from the document.");
        }
      } catch (extractFetchErr: any) {
        console.warn("API extraction failed or unreachable:", extractFetchErr);
        if (questionText.trim()) {
          // Fallback to client-side rule-based parsing so user is never blocked
          const localParsed = parseQuestionsLocally(questionText);
          extractedTopic = localParsed.topic || topicName || "Assignment";
          extractedQuestions = localParsed.questions;
        } else {
          throw new Error(
            extractFetchErr.message?.includes("fetch")
              ? "Unable to reach extraction server. Please paste your question text directly into the text tab or check your connection."
              : extractFetchErr.message || "Failed to extract questions from uploaded file."
          );
        }
      }

      if (extractedQuestions.length === 0) {
        throw new Error("No questions were detected. Please enter or paste question text in Step 1.");
      }

      setTopicName(extractedTopic);
      setQuestions(extractedQuestions);

      // 2. Match answer screenshots to questions
      setProcessingStatus(`Step 2/2: JinAI Vision matching ${images.length} screenshot(s) with ${extractedQuestions.length} question(s)...`);

      let updatedImages: AnswerImage[] = [];

      try {
        const optimizedThumbs = await prepareThumbnailsForAiMatching(images);

        const matchRes = await fetch("/api/match-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: extractedQuestions,
            images: optimizedThumbs,
          }),
        });

        const matchData = await matchRes.json().catch(() => ({}));

        if (matchRes.ok && Array.isArray(matchData.matches) && matchData.matches.length > 0) {
          const matchMap = new Map<string, { questionId: string | null; confidence: number; rationale: string }>();
          matchData.matches.forEach((m: any) => {
            matchMap.set(m.imageId, {
              questionId: m.questionId,
              confidence: m.confidence,
              rationale: m.rationale,
            });
          });

          updatedImages = images.map((img) => {
            const m = matchMap.get(img.id);
            return {
              ...img,
              matchedQuestionId: m ? m.questionId : null,
              confidence: m ? m.confidence : undefined,
              rationale: m ? m.rationale : undefined,
            };
          });
        } else {
          throw new Error(matchData.error || "Matching service returned empty response.");
        }
      } catch (matchFetchErr: any) {
        console.warn("AI matching endpoint error or unreachable, using sequence fallback:", matchFetchErr);
        // Resilient Fallback: Match screenshots sequentially to questions so the user is never blocked!
        updatedImages = images.map((img, idx) => {
          const numMatch = img.name.match(/(?:q|question|task|ans|answer)?\s*([0-9]+)/i);
          let matchedQ = null;
          if (numMatch) {
            const qNum = numMatch[1];
            matchedQ = extractedQuestions.find((q) => q.number === qNum || q.id === `q${qNum}`);
          }
          if (!matchedQ) {
            matchedQ = extractedQuestions[idx % extractedQuestions.length];
          }
          return {
            ...img,
            matchedQuestionId: matchedQ ? matchedQ.id : null,
            confidence: 0.65,
            rationale: "Assigned in document sequence (AI matching was offline - adjust as needed)",
          };
        });
      }

      setImages(updatedImages);
      setCurrentView("review");
    } catch (err: any) {
      console.error("Processing pipeline error:", err);
      setErrorMessage(
        err.message?.includes("Failed to fetch")
          ? "Network connection interrupted while contacting the server. Please check your internet connection or paste text directly."
          : err.message || "An unexpected error occurred during processing."
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Re-run JinAI matching
  const handleReMatchAI = async () => {
    if (!currentUser) {
      setAuthMode("login");
      setIsAuthModalOpen(true);
      return;
    }
    const approval = isUserApproved(currentUser, systemConfig || undefined);
    if (!approval.approved) {
      setIsApprovalModalOpen(true);
      setErrorMessage("Waiting for Account Approval. contact jinesh to approve your account.");
      return;
    }
    const quota = checkGenerationQuota(currentUser);
    if (!quota.allowed) {
      setErrorMessage(quota.reason || `Generation limit reached. Free tier allows ${quota.maxGenerations} document(s) every ${quota.cooldownDays} day(s).`);
      return;
    }
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

      const matchData = await matchRes.json().catch(() => ({}));
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
      console.warn("Error re-matching:", err);
      alert(
        err.message?.includes("Failed to fetch")
          ? "AI matching service was temporarily unreachable. Your existing screenshot assignments remain intact."
          : "Error re-matching: " + err.message
      );
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
    return <AdminPanel onExitAdmin={() => navigateTo("app")} />;
  }

  // -------------------------------------------------------------
  // CLOUDFLARE PROTECTION GATEKEEPER (Pre-verification screening)
  // -------------------------------------------------------------
  if (!isCloudflareVerified && cloudflareEnabled) {
    return (
      <CloudflareProtection
        onVerified={() => {
          setIsCloudflareVerified(true);
          sessionStorage.setItem("docify_cf_cleared", "true");
        }}
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
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setIsAuthModalOpen(true);
        }}
        onOpenDashboard={() => setIsDashboardModalOpen(true)}
      />

      {/* Google Ads Top App Banner (Free tier only) */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2">
        <GoogleAd
          format="horizontal"
          slotId="top-app-banner"
          isPaidUser={currentUser?.plan === "paid"}
        />
      </div>

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

            {/* Account Approval Warning Banner */}
            {currentUser && !userApproval.approved && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-300">
                      Waiting for Account Approval
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Waiting for Account Approval. contact jinesh to approve your account.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer self-start sm:self-center shrink-0 shadow-xs"
                >
                  View Details / Contact
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    Ready to link questions with screenshots?
                  </h3>
                  {!currentUser ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Lock className="w-3 h-3" />
                      Account Required
                    </span>
                  ) : !userApproval.approved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Waiting for Account Approval
                    </span>
                  ) : !checkGenerationQuota(currentUser).allowed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3 h-3" />
                      Limit Reached ({checkGenerationQuota(currentUser).usedInWindow}/{checkGenerationQuota(currentUser).maxGenerations})
                    </span>
                  ) : currentUser.plan === "free" && checkGenerationQuota(currentUser).usedInWindow > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {checkGenerationQuota(currentUser).remainingInWindow}/{checkGenerationQuota(currentUser).maxGenerations} Free Available
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {!currentUser
                    ? "Please sign in or register to analyze screenshots and generate Word assignments with JinAI."
                    : !userApproval.approved
                    ? "Waiting for Account Approval. contact jinesh to approve your account."
                    : !checkGenerationQuota(currentUser).allowed
                    ? checkGenerationQuota(currentUser).reason
                    : "JinAI Vision analyzes code solutions, 8085 assembly, terminal outputs, diagrams, and formulas."}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <button
                  id="process-assignment-btn"
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setAuthMode("login");
                      setIsAuthModalOpen(true);
                      return;
                    }
                    if (!userApproval.approved) {
                      setIsApprovalModalOpen(true);
                      return;
                    }
                    const quota = checkGenerationQuota(currentUser);
                    if (!quota.allowed) {
                      setErrorMessage(quota.reason || `Generation limit reached for free accounts.`);
                      return;
                    }
                    handleRunProcessing();
                  }}
                  disabled={
                    isProcessing ||
                    (Boolean(currentUser) && (
                      !userApproval.approved ||
                      !checkGenerationQuota(currentUser).allowed ||
                      (!questionText.trim() && !questionFile) ||
                      images.length === 0
                    ))
                  }
                  className={`w-full sm:w-auto min-h-[46px] px-6 py-3 font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !currentUser
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 hover:shadow-md"
                      : !userApproval.approved
                      ? "bg-amber-600/90 hover:bg-amber-600 text-white shadow-amber-600/20"
                      : !checkGenerationQuota(currentUser).allowed
                      ? "bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed border border-neutral-300 dark:border-neutral-700"
                      : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs hover:shadow-md"
                  }`}
                  title={
                    !currentUser
                      ? "Click to login or create a free account"
                      : !userApproval.approved
                      ? "Waiting for Account Approval. contact jinesh to approve your account."
                      : !checkGenerationQuota(currentUser).allowed
                      ? checkGenerationQuota(currentUser).reason || "Generation limit reached."
                      : "Extract questions & match screenshots"
                  }
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Matching with JinAI...</span>
                    </>
                  ) : !currentUser ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign in to Extract &amp; Match</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : !userApproval.approved ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Waiting for Account Approval</span>
                      <Lock className="w-3.5 h-3.5 ml-1 opacity-70" />
                    </>
                  ) : !checkGenerationQuota(currentUser).allowed ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span>Weekly Limit Reached</span>
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
              currentUser={currentUser}
              onUserUpdate={handleUserUpdate}
              onOpenAuth={(mode) => {
                setAuthMode(mode);
                setIsAuthModalOpen(true);
              }}
              onGenerationComplete={() => {
                if (currentUser) {
                  setCurrentUserState((prev) =>
                    prev
                      ? {
                          ...prev,
                          docsGeneratedCount: (prev.docsGeneratedCount || 0) + 1,
                          lastGenerationAt: new Date().toISOString(),
                        }
                      : null
                  );
                }
              }}
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

      {/* Processing Animation Overlay with Ads for free users */}
      <ProcessingOverlay
        isOpen={isProcessing}
        statusText={processingStatus}
        imageCount={images.length}
        isPaidUser={currentUser?.plan === "paid"}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* User Login & Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* User Dashboard & Generated Documents History Modal */}
      {currentUser && (
        <UserDashboardModal
          isOpen={isDashboardModalOpen}
          user={currentUser}
          onClose={() => setIsDashboardModalOpen(false)}
          onLogout={handleLogout}
          onUserUpdate={handleUserUpdate}
        />
      )}

      {/* Account Approval Notice Modal */}
      <AccountApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        currentUser={currentUser}
        onApprovalVerified={(updatedUser) => {
          handleUserUpdate(updatedUser);
        }}
      />

      {/* Footer with Legal & Contact Policies */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-xs text-neutral-500 dark:text-neutral-400 mt-auto bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap justify-center text-center sm:text-left">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Docify by JineshMehta</span>
            <span>• High-speed assignment to Word processor</span>
          </div>

          {/* Legal and Support Links */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <button
              type="button"
              onClick={() => setLegalModalSection("about")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              About
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              type="button"
              onClick={() => setLegalModalSection("contact")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Contact &amp; Support
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              type="button"
              onClick={() => setLegalModalSection("privacy")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              type="button"
              onClick={() => setLegalModalSection("refund")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Refund &amp; Return
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              type="button"
              onClick={() => setLegalModalSection("disclaimer")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Disclaimer
            </button>
          </div>
        </div>
      </footer>

      {/* Global Legal & Policy Modal */}
      <LegalPagesModal
        isOpen={Boolean(legalModalSection)}
        initialSection={legalModalSection || "about"}
        onClose={() => setLegalModalSection(null)}
      />
    </div>
  );
}
