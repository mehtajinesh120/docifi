import React from "react";
import { FileText, RefreshCw, Sun, Moon, User, Sparkles, Crown } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: (mode: "login" | "register") => void;
  onOpenDashboard: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  hasData,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  onOpenDashboard,
}) => {
  return (
    <header
      id="app-header"
      className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
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
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 hidden md:block truncate">
              Auto-match screenshots with assignment questions &amp; export ready-to-submit Word documents
            </p>
          </div>
        </div>

        {/* Action Controls & User Account */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center p-2 text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Reset Workspace Button */}
          {hasData && (
            <button
              id="reset-workspace-btn"
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              title="Clear all data and start fresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* User Profile Pill OR Sign In Button */}
          {currentUser ? (
            <button
              id="user-profile-btn"
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors cursor-pointer"
              title="Open User Dashboard"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {currentUser.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 max-w-[100px] truncate">
                  {currentUser.username}
                </span>
                {currentUser.plan === "paid" ? (
                  <span className="px-1.5 py-0.2 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                    <Crown className="w-2.5 h-2.5" /> PRO
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[9px] font-semibold">
                    Free
                  </span>
                )}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="header-login-btn"
                type="button"
                onClick={() => onOpenAuth("login")}
                className="px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                id="header-register-btn"
                type="button"
                onClick={() => onOpenAuth("register")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>Join Free</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
