import React, { useState } from "react";
import {
  Download,
  FileCheck2,
  Check,
  Loader2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Question, AnswerImage, DocifyConfig, UserProfile } from "../types";
import { generateDocxBlob, downloadDocx } from "../utils/docxExport";
import { DownloadConfirmationModal } from "./DownloadConfirmationModal";
import { AccountApprovalModal } from "./AccountApprovalModal";
import { GoogleAd } from "./GoogleAd";
import { checkGenerationQuota, recordDocumentGeneration, isUserApproved } from "../lib/supabase";
import { Clock, Lock, Sparkles, Crown, AlertTriangle, UserCheck } from "lucide-react";

interface ExportSectionProps {
  topicName: string;
  questions: Question[];
  images: AnswerImage[];
  currentUser?: UserProfile | null;
  onOpenAuth?: (mode: "login" | "register") => void;
  onGenerationComplete?: () => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  topicName,
  questions,
  images,
  currentUser = null,
  onOpenAuth,
  onGenerationComplete,
  onUserUpdate,
}) => {
  const [config, setConfig] = useState<DocifyConfig>({
    topicName: topicName || "Assignment",
    questionsPerPage: 1, // Default 1 question per page as common for lab/assignment manuals
    printBlankForUnanswered: true,
    blankSpaceLines: 5,
    studentName: "",
    rollNumber: "",
    subjectCode: "",
    includeStudentHeader: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Sync topicName if changed from parent
  React.useEffect(() => {
    setConfig((prev) => ({ ...prev, topicName }));
  }, [topicName]);

  // Compute stats
  const imageMap = new Map<string, AnswerImage[]>();
  images.forEach((img) => {
    if (img.matchedQuestionId) {
      const existing = imageMap.get(img.matchedQuestionId) || [];
      existing.push(img);
      imageMap.set(img.matchedQuestionId, existing);
    }
  });

  const answeredQuestions = questions.filter(
    (q) => (imageMap.get(q.id) || []).length > 0 || (q.textAnswer && q.textAnswer.trim().length > 0)
  );
  const unansweredQuestions = questions.filter(
    (q) => (imageMap.get(q.id) || []).length === 0 && (!q.textAnswer || q.textAnswer.trim().length === 0)
  );

  const finalQuestionsCount = config.printBlankForUnanswered
    ? questions.length
    : answeredQuestions.length;

  const estimatedPages =
    config.questionsPerPage > 0
      ? Math.ceil(finalQuestionsCount / config.questionsPerPage)
      : Math.max(1, Math.ceil(finalQuestionsCount / 2));

  const quota = checkGenerationQuota(currentUser);
  const approval = isUserApproved(currentUser);

  // Step 1: When user clicks download
  const handleInitiateDownload = () => {
    // 1st step: must be signed in / signed up
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth("login");
      }
      return;
    }

    // 2nd step: check if account is approved
    if (!approval.approved) {
      setIsApprovalModalOpen(true);
      return;
    }

    if (finalQuestionsCount === 0) {
      alert("No questions selected to export! Enable 'Keep unanswered questions' or attach answers.");
      return;
    }
    if (!quota.allowed) {
      alert(quota.reason || "Generation cooldown is active.");
      return;
    }
    // Only show confirmation modal for free users; paid users download directly without popup!
    if (currentUser?.plan === "paid") {
      handleExecuteDownload();
    } else {
      setIsConfirmationModalOpen(true);
    }
  };

  // Step 2: When user confirms in popup, execute document generation & download
  const handleExecuteDownload = async () => {
    setIsConfirmationModalOpen(false);
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const blob = await generateDocxBlob(questions, images, config);
      const filename = `Docify_${config.topicName || "Assignment"}`.trim();
      downloadDocx(blob, filename);

      // Record generation in database/Supabase & save to history
      await recordDocumentGeneration({
        userId: currentUser?.id || "anonymous",
        topicName: config.topicName || "Assignment",
        questionCount: finalQuestionsCount,
        imageCount: images.length,
        fileName: `${filename}.docx`,
        fileBlob: blob,
      });

      if (onGenerationComplete) {
        onGenerationComplete();
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      console.error("Export error:", err);
      alert("Failed to create Word document: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="export-section" className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 transition-colors">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Word Document (.docx) Export Settings</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Configure layout, pagination, and unanswered questions formatting
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Setting: Questions Per Page */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-2">
              Questions Per Page in Word Document
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { label: "1 / page", val: 1 },
                { label: "2 / page", val: 2 },
                { label: "3 / page", val: 3 },
                { label: "4 / page", val: 4 },
                { label: "Auto Flow", val: 0 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setConfig({ ...config, questionsPerPage: item.val })}
                  className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    config.questionsPerPage === item.val
                      ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800"
                  }`}
                >
                  <div className="font-bold">{item.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {config.questionsPerPage === 0
                ? "Questions and answers flow continuously without forced page breaks."
                : `Inserts a clean page break every ${config.questionsPerPage} question(s) for crisp lab manual layout.`}
            </p>
          </div>

          {/* Unanswered Questions Handling */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-2">
              Unanswered Questions Handling
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="unanswered-mode"
                  checked={config.printBlankForUnanswered}
                  onChange={() => setConfig({ ...config, printBlankForUnanswered: true })}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Yes — Keep all questions in document (Print ruled space)
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                    Questions without screenshots will include {config.blankSpaceLines} ruled blank answer lines.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="unanswered-mode"
                  checked={!config.printBlankForUnanswered}
                  onChange={() => setConfig({ ...config, printBlankForUnanswered: false })}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    No — Only export questions with answered screenshots or text
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                    Exclude questions that have neither screenshot nor written answer.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Student Details & Document Summary */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Student Header (Optional)
              </label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, includeStudentHeader: !config.includeStudentHeader })}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                {config.includeStudentHeader ? "Disable Header" : "+ Add Student Details"}
              </button>
            </div>

            {config.includeStudentHeader ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div>
                  <label className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium block mb-1">Student Name</label>
                  <input
                    type="text"
                    value={config.studentName || ""}
                    onChange={(e) => setConfig({ ...config, studentName: e.target.value })}
                    placeholder="e.g. Alex Smith"
                    className="w-full text-xs p-1.5 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium block mb-1">Roll / ID Number</label>
                  <input
                    type="text"
                    value={config.rollNumber || ""}
                    onChange={(e) => setConfig({ ...config, rollNumber: e.target.value })}
                    placeholder="e.g. 21CS045"
                    className="w-full text-xs p-1.5 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium block mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={config.subjectCode || ""}
                    onChange={(e) => setConfig({ ...config, subjectCode: e.target.value })}
                    placeholder="e.g. CS302"
                    className="w-full text-xs p-1.5 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                Optional: Add student name, roll number, and course code at top-right of document.
              </p>
            )}
          </div>

          {/* Document Summary Card */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/70 rounded-xl border border-neutral-200/90 dark:border-neutral-750">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-2.5">
              Export Document Preview Summary
            </h4>
            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="flex justify-between">
                <span>Header Topic:</span>
                <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[220px]">
                  {config.topicName || "Assignment"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Questions in Export:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {finalQuestionsCount} {finalQuestionsCount === 1 ? "question" : "questions"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pagination Setting:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {config.questionsPerPage === 0 ? "Continuous" : `${config.questionsPerPage} Question(s) / Page`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Unanswered Included:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {config.printBlankForUnanswered
                    ? `Yes (${unansweredQuestions.length} with blank lines)`
                    : "No (Excluded)"}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-neutral-200/70 dark:border-neutral-700 font-bold text-neutral-900 dark:text-white">
                <span>Estimated Word Pages:</span>
                <span className="text-blue-600 dark:text-blue-400">~{estimatedPages} {estimatedPages === 1 ? "page" : "pages"}</span>
              </div>
            </div>
          </div>

          {/* Authentication Required Banner */}
          {!currentUser && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Account Required to Download</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                Step 1: Please sign in or create an account before generating and downloading your completed Word document.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth?.("login")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Sign In / Create Account</span>
              </button>
            </div>
          )}

          {/* Account Approval Pending Banner */}
          {currentUser && !approval.approved && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Waiting for Account Approval</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded-lg transition-colors cursor-pointer"
                >
                  Check Status
                </button>
              </div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-relaxed">
                Waiting for Account Approval. contact jinesh to approve your account.
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Your account (<span className="font-semibold text-neutral-800 dark:text-neutral-200">@{currentUser.username}</span>) is pending administrator approval before you can download Word documents.
              </p>
            </div>
          )}

          {/* Quota Cooldown Banner (if user on free plan and cooldown active) */}
          {currentUser && approval.approved && !quota.allowed && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Generation Limit Reached (Free Tier)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {quota.reason}
              </p>
              {quota.unlockDate && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                  Next download unlocks: {quota.unlockDate.toLocaleDateString()} at{" "}
                  {quota.unlockDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          )}

          {/* Big Download Button */}
          <div>
            <button
              id="download-word-docx-btn"
              type="button"
              onClick={handleInitiateDownload}
              disabled={
                isGenerating ||
                finalQuestionsCount === 0 ||
                (Boolean(currentUser) && !approval.approved) ||
                !quota.allowed
              }
              className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                !currentUser
                  ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-amber-600/20 hover:shadow-md"
                  : !approval.approved
                  ? "bg-amber-600/90 hover:bg-amber-600 text-white cursor-pointer shadow-amber-600/20"
                  : !quota.allowed
                  ? "bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed border border-neutral-300 dark:border-neutral-700"
                  : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs hover:shadow-md cursor-pointer"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Packaging Word Document (.docx)...</span>
                </>
              ) : !currentUser ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign in to Download Word Document</span>
                </>
              ) : !approval.approved ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Waiting for Account Approval (Download Locked)</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-5 h-5 text-emerald-300" />
                  <span>Downloaded Successfully!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Word Document (.docx)</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 mt-2 px-1">
              <span>Standard Microsoft Word (.docx) format</span>
              <span>Clean Print Layout</span>
            </div>

            {/* Google Ads Banner (Free Tier only) */}
            <div className="mt-4">
              <GoogleAd
                format="horizontal"
                slotId="export-bottom-banner"
                isPaidUser={currentUser?.plan === "paid"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Download Samosa Confirmation Modal */}
      <DownloadConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirmDownload={handleExecuteDownload}
        isGenerating={isGenerating}
      />

      {/* Account Approval Notice Modal */}
      <AccountApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        currentUser={currentUser}
        onApprovalVerified={(updatedUser) => {
          if (onUserUpdate) onUserUpdate(updatedUser);
        }}
      />
    </div>
  );
};
