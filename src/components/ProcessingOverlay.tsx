import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Cpu,
  Layers,
  Search,
} from "lucide-react";

interface ProcessingOverlayProps {
  isOpen: boolean;
  statusText: string;
  imageCount: number;
}

const AI_TIPS = [
  "Analyzing C, C++, Python, Java, and 8085/8086 Assembly code in screenshots...",
  "Scanning terminal printouts, compiler logs, and execution outputs...",
  "Detecting mathematical formulas, circuits, and scientific diagrams...",
  "Pairing screenshot answers directly to their corresponding assignment tasks...",
  "Formatting clean question headings and aesthetic divider lines...",
];

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isOpen,
  statusText,
  imageCount,
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isOpen) {
      setProgress(15);
      return;
    }

    // Cycle rotating tips every 2.6 seconds
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % AI_TIPS.length);
    }, 2600);

    // Smooth pseudo progress that responds to stages
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 88) {
          return prev + Math.floor(Math.random() * 8) + 2;
        }
        return prev;
      });
    }, 450);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="processing-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md transition-all"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      >
        {/* Top Header Graphic */}
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-8 text-white text-center overflow-hidden">
          {/* Animated decorative glow circles */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

          {/* Central Animated Orb */}
          <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
            {/* Outer pulsating ring */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.7, 0.35],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full bg-blue-300/30 border border-white/40"
            />
            {/* Secondary rotating dashed ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-1 rounded-full border-2 border-dashed border-white/40"
            />
            {/* Core icon container */}
            <div className="relative w-14 h-14 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 animate-pulse text-blue-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white mb-1">
            JinAI Processing
          </h3>
          <p className="text-xs font-medium text-blue-100/90">
            Intelligent Question Parsing &amp; Answer Screenshot Matching
          </p>

          {/* Scanner laser animation bar */}
          <div className="relative mt-4 h-1 w-full bg-blue-950/30 rounded-full overflow-hidden">
            <motion.div
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#38bdf8]"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Text */}
          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-0.5">
                Current Pipeline Phase
              </p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">
                {statusText || "Analyzing questions & linking screenshots with JinAI..."}
              </p>
            </div>
          </div>

          {/* Progress Bar with Percentage */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Pipeline Progress
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{Math.min(progress, 96)}%</span>
            </div>
            <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/70 dark:border-neutral-700 p-0.5">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 96)}%` }}
              />
            </div>
          </div>

          {/* Multi-step list */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate">Questions Parsed</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate">
                {imageCount} Screenshot{imageCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Live Animated Insights Ticker */}
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200/80 dark:border-neutral-700">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              <Search className="w-3 h-3 text-blue-500" />
              <span>JinAI Engine Activity</span>
            </div>
            <div className="min-h-[38px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.24 }}
                  className="text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed"
                >
                  {AI_TIPS[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-200/70 dark:border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Accelerated by JinAI • Parallel Multimodal Processing
          </p>
        </div>
      </motion.div>
    </div>
  );
};
