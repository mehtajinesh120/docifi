import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Mail,
  Copy,
  Check,
  RefreshCw,
  X,
  ShieldAlert,
  FileText,
  Sparkles,
  Lock,
} from "lucide-react";
import { UserProfile } from "../types";
import { refreshCurrentUser, isUserApproved } from "../lib/supabase";

interface AccountApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onApprovalVerified?: (updatedUser: UserProfile) => void;
}

export const AccountApprovalModal: React.FC<AccountApprovalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onApprovalVerified,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const approval = isUserApproved(currentUser);
  const adminEmail = "jineshgamer120@gmail.com";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      const refreshed = await refreshCurrentUser();
      if (refreshed) {
        const freshApproval = isUserApproved(refreshed);
        if (freshApproval.approved) {
          setFeedback("Success! Your account has been approved.");
          if (onApprovalVerified) {
            onApprovalVerified(refreshed);
          }
          setTimeout(() => {
            onClose();
          }, 1200);
          return;
        } else {
          setFeedback("Status checked: Your account is still awaiting approval from Jinesh.");
        }
      } else {
        setFeedback("Status checked: Still awaiting approval.");
      }
    } catch {
      setFeedback("Unable to reach server. Please check your internet connection.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(adminEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="account-approval-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="account-approval-modal-dialog"
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      >
        {/* Header Header Pattern */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Account Approval Required
              </h3>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Waiting for Account Approval
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-snug">
              Waiting for Account Approval. contact jinesh to approve your account.
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
              To keep Docify secure and manage server resources, student accounts must be verified by the administrator before running assignments or downloading files.
            </p>
          </div>

          {/* User Account Info Card */}
          {currentUser && (
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Account:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  @{currentUser.username}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Email:</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300">
                  {currentUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Current Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3" />
                  {currentUser.status === "rejected" ? "Declined" : "Pending Administrator Approval"}
                </span>
              </div>
            </div>
          )}

          {/* Locked Services info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Services Unlocked Upon Approval
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>JinAI Extract &amp; Match</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Word .docx Downloads</span>
              </div>
            </div>
          </div>

          {/* Feedback message if any */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                feedback.includes("Success")
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {feedback}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <button
              id="refresh-approval-status-btn"
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking Approval Status..." : "Check / Refresh Status"}</span>
            </button>

            <div className="flex items-center gap-2">
              <a
                href={`mailto:${adminEmail}?subject=Docify%20Account%20Approval%20Request%20-%20${currentUser?.username || "Student"}&body=Hi%20Jinesh,%0D%0A%0D%0APlease%20approve%20my%20Docify%20account:%0D%0AUsername:%20${currentUser?.username || ""}%0D%0AEmail:%20${currentUser?.email || ""}%0D%0A%0D%0AThank%20you!`}
                className="flex-1 py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs rounded-xl transition-colors text-center inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span>Email Jinesh</span>
              </a>

              <button
                type="button"
                onClick={handleCopyEmail}
                className="py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                title="Copy Jinesh's Email Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                <span>{copied ? "Copied!" : "Copy Email"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>Administrator Contact: {adminEmail}</span>
          <button
            type="button"
            onClick={onClose}
            className="font-medium text-neutral-700 dark:text-neutral-300 hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
