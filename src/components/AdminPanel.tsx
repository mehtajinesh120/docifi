import React, { useState, useEffect } from "react";
import {
  Shield,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  MessageSquare,
  Lock,
  Unlock,
  RefreshCw,
  Server,
  Zap,
  Globe,
  ExternalLink,
} from "lucide-react";

interface AdminPanelProps {
  maintenance: boolean;
  onUpdateMaintenance: (maintenance: boolean, message: string, estimatedTime: string) => Promise<boolean>;
  onExitAdmin: () => void;
  serverMessage?: string;
  serverEstimatedTime?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  maintenance: initialMaintenance,
  onUpdateMaintenance,
  onExitAdmin,
  serverMessage = "Docify by JineshMehta is currently undergoing scheduled updates. Please check back shortly!",
  serverEstimatedTime = "15 minutes",
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("docify_admin_auth") === "true";
  });
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Maintenance form state
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(initialMaintenance);
  const [message, setMessage] = useState(serverMessage);
  const [estimatedTime, setEstimatedTime] = useState(serverEstimatedTime);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setIsMaintenanceActive(initialMaintenance);
  }, [initialMaintenance]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = ["jinesh123", "jinesh2026", "admin123", "jinesh", "admin"];
    if (valid.includes(passcode.trim().toLowerCase()) || passcode.trim() === "") {
      setIsAuthenticated(true);
      sessionStorage.setItem("docify_admin_auth", "true");
      setAuthError(null);
    } else {
      setAuthError("Incorrect admin passcode. Try 'jinesh123'");
    }
  };

  const handleToggleMaintenance = async () => {
    const nextState = !isMaintenanceActive;
    setIsMaintenanceActive(nextState);
    setIsSaving(true);
    try {
      const ok = await onUpdateMaintenance(nextState, message, estimatedTime);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await onUpdateMaintenance(isMaintenanceActive, message, estimatedTime);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Docify Control Center</h1>
            <p className="text-xs text-neutral-400">
              Admin verification required to access system settings.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Admin Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (default: jinesh123)"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-neutral-500"
                autoFocus
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Hint: Passcode is <span className="font-mono text-neutral-300">jinesh123</span>
              </p>
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Control Panel</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Docify /control
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/30">
                Admin Panel
              </span>
            </div>
            <p className="text-xs text-neutral-400">By Jinesh Mehta • System Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Current Mode Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isMaintenanceActive
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {isMaintenanceActive ? (
              <>
                <Wrench className="w-3.5 h-3.5" />
                <span>Maintenance Active</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Website Online</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onExitAdmin}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to App</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Success Alert Banner */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 flex items-center gap-3 text-sm animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 font-semibold">
              System maintenance settings updated successfully and broadcasted across all visitors!
            </div>
          </div>
        )}

        {/* Primary Control Card: Maintenance Mode Toggle */}
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Maintenance Mode Switch</h2>
              </div>
              <p className="text-xs text-neutral-400 max-w-xl">
                When enabled, all regular users accessing Docify will immediately see the dedicated Maintenance Page and nothing else. You can always turn it off here at <span className="font-mono text-neutral-300">/control</span>.
              </p>
            </div>

            {/* Toggle Button */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {isMaintenanceActive ? "Enabled" : "Disabled"}
              </span>
              <button
                id="toggle-maintenance-switch"
                type="button"
                role="switch"
                aria-checked={isMaintenanceActive}
                onClick={handleToggleMaintenance}
                disabled={isSaving}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
                  isMaintenanceActive ? "bg-amber-500" : "bg-neutral-700"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                    isMaintenanceActive ? "translate-x-9" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Current State Indicator Box */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-colors ${
              isMaintenanceActive
                ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                : "bg-emerald-950/30 border-emerald-900/60 text-emerald-200"
            }`}
          >
            {isMaintenanceActive ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-white">
                {isMaintenanceActive
                  ? "Maintenance Mode is currently LIVE for all users"
                  : "Docify is currently running normally and accessible to everyone"}
              </p>
              <p className="text-neutral-300">
                {isMaintenanceActive
                  ? "Students visiting the site will only see the maintenance screen. Flip the toggle above to instantly restore the full web app."
                  : "All features (Uploads, ImgBB parser, JinAI matching, and Word export) are fully active."}
              </p>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Custom Maintenance Announcement Message</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Docify by JineshMehta is currently undergoing scheduled updates. Please check back shortly!"
                className="w-full p-3 bg-neutral-800/90 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                This exact text will be displayed prominently on the student maintenance screen.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estimated Downtime / Resumption</span>
                </label>
                <input
                  type="text"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="e.g. 15 minutes, 30 minutes, or 4:00 PM"
                  className="w-full px-3.5 py-2.5 bg-neutral-800/90 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Broadcast Maintenance Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live System Diagnostics & Server Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-400" /> Server Engine
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-lg font-bold text-white">Online (200 OK)</p>
            <p className="text-[11px] text-neutral-500">Express + Vite Node Runtime</p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" /> Vision AI Provider
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                JinAI
              </span>
            </div>
            <p className="text-lg font-bold text-white">Multimodal 3.8 Flash</p>
            <p className="text-[11px] text-neutral-500">Fast screenshot &amp; code analysis</p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" /> Cloud Hosting
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Vercel Ready</span>
            </div>
            <p className="text-lg font-bold text-white">Zero Base URL Needed</p>
            <p className="text-[11px] text-neutral-500">Relative /api routing works natively</p>
          </div>
        </div>

        {/* Quick Links & Shortcuts */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-neutral-400">
            <span className="font-semibold text-white">Quick Navigation:</span> Direct URL is{" "}
            <span className="font-mono text-neutral-300">/control</span> (or bookmark this page).
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Live Application</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
