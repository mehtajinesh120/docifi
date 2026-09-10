import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Sparkles, CheckCircle2 } from "lucide-react";

interface DownloadConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownload: () => void;
  isGenerating?: boolean;
}

export const DownloadConfirmationModal: React.FC<DownloadConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmDownload,
  isGenerating = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="download-confirmation-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-amber-200/80 dark:border-amber-900/50 overflow-hidden text-neutral-900 dark:text-white"
        >
          {/* Top Decorative Banner */}
          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 text-center text-white overflow-hidden">
            {/* Background glowing shapes */}
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/15 blur-lg pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-orange-700/30 blur-lg pointer-events-none" />

            {/* Close Button */}
            <button
              id="close-confirmation-modal-btn"
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Celebration Icon / Samosa badge */}
            <div className="relative mx-auto w-16 h-16 mb-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform">
              <span className="text-3xl" role="img" aria-label="samosa">
                🥟
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide uppercase shadow-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Assignment Download</span>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 sm:p-7 text-center space-y-5">
            {/* The exact requested text with Jinesh highlighted */}
            <div className="space-y-2">
              <p className="text-lg sm:text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
                Free me Download karke
              </p>

              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-snug">
                <span className="inline-block px-2.5 py-0.5 mx-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-black transform hover:scale-105 transition-transform">
                  Jinesh
                </span>
                ko Thank you bolna class me.
              </p>
            </div>

            {/* Playful friendship card */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs sm:text-sm text-amber-950 dark:text-amber-200 flex items-center justify-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
              <span>
                Engineered with love so you don&apos;t spend hours cropping screenshots!
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              <button
                id="confirm-samosa-download-btn"
                type="button"
                onClick={onConfirmDownload}
                disabled={isGenerating}
                className="w-full min-h-[50px] px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-orange-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-100" />
                <span className="text-center font-extrabold">
                  Ha bhai boldunga or ak Samosa bhi khiulnga free me 😋
                </span>
              </button>

              <button
                id="cancel-confirmation-btn"
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer py-1"
              >
                Ek baar document preview check karna hai
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
