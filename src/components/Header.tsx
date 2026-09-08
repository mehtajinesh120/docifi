import React from "react";
import { FileText, RefreshCw, CheckCircle2, Sun, Moon, Globe, Shield } from "lucide-react";

interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenDeploymentGuide: () => void;
  onGoToAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  hasData,
  theme,
  onToggleTheme,
  onOpenDeploymentGuide,
  onGoToAdmin,
}) => {
  return (
    <header
      id="app-header"
      className="border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>Docify</span>
                <span className="text-xs sm:text-sm font-normal text-neutral-500 dark:text-neutral-400">by</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-xs sm:text-sm shadow-xs tracking-wide">
                  Jinesh Mehta
                </span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Free Edition
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 hidden md:block truncate">
              Auto-match screenshots with assignment questions &amp; export ready-to-submit Word documents
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Free Vercel Hosting Guide Button */}
          <button
            id="vercel-guide-btn"
            type="button"
            onClick={onOpenDeploymentGuide}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer"
            title="How to host Docify for free on Vercel"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden sm:inline">Vercel Guide</span>
            <span className="sm:hidden">Deploy</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center p-2 text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Reset Workspace */}
          {hasData && (
            <button
              id="reset-workspace-btn"
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
              title="Clear all data and start fresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Direct Admin Control Link */}
          {onGoToAdmin && (
            <button
              id="header-control-link"
              type="button"
              onClick={onGoToAdmin}
              className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Admin Panel (/control)"
            >
              <Shield className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden lg:inline">/control</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
