import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Crown,
  Sparkles,
  Clock,
  FileText,
  Download,
  Calendar,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { UserProfile, GeneratedDocument } from "../types";
import { getUserDocuments, checkGenerationQuota, setCurrentUser } from "../lib/supabase";

interface UserDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
  onUserUpdate?: (updatedUser: UserProfile) => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onUserUpdate,
}) => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setLoadingDocs(true);
      getUserDocuments(user.id)
        .then((docs) => setDocuments(docs))
        .catch(() => setDocuments([]))
        .finally(() => setLoadingDocs(false));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const quota = checkGenerationQuota(user);

  const handleSaveUsername = () => {
    if (!newUsername.trim()) return;
    const updated: UserProfile = { ...user, username: newUsername.trim() };
    setCurrentUser(updated);
    if (onUserUpdate) onUserUpdate(updated);
    setIsEditingUsername(false);
    setSuccessMessage("Username updated successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="user-dashboard-card"
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shrink-0">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                  {user.username}
                </h3>
                {user.plan === "paid" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                    <Crown className="w-3 h-3" /> PRO TIER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    Free Student Tier
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quota & Generation Limit Card */}
          <div
            className={`p-5 rounded-2xl border ${
              user.plan === "paid"
                ? "bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border-amber-400/40 dark:border-amber-500/30"
                : quota.allowed
                ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60"
                : "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {user.plan === "paid" ? (
                    <Zap className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-neutral-500" />
                  )}
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {user.plan === "paid"
                      ? "Unlimited Generations"
                      : `Free Tier Quota (${quota.maxGenerations || 1} doc${(quota.maxGenerations || 1) > 1 ? "s" : ""} / ${quota.cooldownDays || 7} days)`}
                  </h4>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {user.plan === "paid"
                    ? "Your account has full unlimited access. Generate as many assignment docs as you need, anytime, with zero ads!"
                    : quota.allowed
                    ? `${quota.remainingInWindow} of ${quota.maxGenerations} free generation(s) available in your current ${quota.cooldownDays}-day window.`
                    : quota.reason}
                </p>
              </div>

              {user.plan === "free" && (
                <div className="shrink-0">
                  <span
                    className={`inline-block px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      quota.allowed
                        ? "bg-emerald-600 text-white border-emerald-700"
                        : "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                    }`}
                  >
                    {quota.allowed
                      ? `${quota.remainingInWindow} / ${quota.maxGenerations} Ready`
                      : "Cooldown Active"}
                  </span>
                </div>
              )}
            </div>

            {/* If cooldown is active, show target unlock date */}
            {user.plan === "free" && !quota.allowed && quota.unlockDate && (
              <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                <span>Next free document unlock:</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {quota.unlockDate.toLocaleDateString()} at {quota.unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Account Profile Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Display Username
              </span>
              {isEditingUsername ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{user.username}</p>
                  <button
                    type="button"
                    onClick={() => setIsEditingUsername(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Docs Generated Total
              </span>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {user.docsGeneratedCount || 0} Assignment(s)
              </p>
            </div>
          </div>

          {/* User's Generated Documents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>My Generated Documents ({documents.length})</span>
              </h4>
            </div>

            {loadingDocs ? (
              <div className="p-6 text-center text-xs text-neutral-400">Loading your history...</div>
            ) : documents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700 text-center space-y-2">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No documents generated yet. Match your assignment questions and screenshots to export your first ready-to-submit Word file!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">
                        {doc.topicName}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <span>{doc.questionCount} Questions</span>
                        <span>•</span>
                        <span>{doc.imageCount} Screenshots</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>

                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monetization / Pro Upgrade Card (Razorpay Ready) */}
          {user.plan === "free" && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-indigo-700/50 text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro Tier
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/30 rounded-full text-indigo-200 border border-indigo-400/30">
                  Razorpay Checkout Ready
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                Bypass the 7-day limit with <strong>Unlimited Document Generations</strong> and a <strong>100% Ad-Free</strong> experience.
              </p>
              <p className="text-[11px] text-neutral-400">
                To upgrade your account right away, contact the admin or ask the administrator at <code className="text-amber-300">/control</code> to flip your account to Paid.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-xl transition-all hover:opacity-90 cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
