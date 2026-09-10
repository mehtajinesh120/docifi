import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Wrench, Clock, ShieldAlert, RefreshCw, Lock } from "lucide-react";

interface MaintenancePageProps {
  message?: string;
  estimatedTime?: string;
  onGoToAdmin: () => void;
  onRefreshStatus?: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  message = "Docify by JineshMehta is currently undergoing scheduled updates and server maintenance. Please check back shortly!",
  estimatedTime = "15 minutes",
  onGoToAdmin,
  onRefreshStatus,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(8);

  // Auto-countdown to re-check status every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (onRefreshStatus) onRefreshStatus();
          return 8;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefreshStatus]);

  return (
    <div
      id="maintenance-page"
      className="min-h-screen w-full bg-neutral-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 max-w-lg w-full bg-neutral-850/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-10 text-center shadow-2xl space-y-6"
      >
        {/* Animated Wrench / Gear Badge */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/40"
          />
          <div className="w-18 h-18 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Wrench className="w-9 h-9 animate-bounce" />
          </div>
        </div>

        {/* Brand & Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>System Maintenance Active</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Docify by JineshMehta
          </h1>

          <p className="text-base text-neutral-300 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Estimated Completion Card */}
        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs sm:text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Estimated Resumption:</span>
          </div>
          <span className="font-bold text-amber-300">{estimatedTime}</span>
        </div>

        {/* Auto Refresh indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400" />
          <span>Auto-checking server status in {secondsLeft}s...</span>
        </div>
      </motion.div>

      {/* Footer copyright */}
      <footer className="mt-8 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} Docify by JineshMehta. All rights reserved.
      </footer>
    </div>
  );
};
