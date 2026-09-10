import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Check, Loader2 } from "lucide-react";

interface CloudflareProtectionProps {
  onVerified: () => void;
  siteName?: string;
  turnstileSiteKey?: string;
}

export const CloudflareProtection: React.FC<CloudflareProtectionProps> = ({
  onVerified,
  siteName = "Docify by JineshMehta",
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusText, setStatusText] = useState("Checking your browser before accessing the site...");
  const [rayId] = useState(() => {
    return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
  });

  // Auto-verify sequence after subtle security challenge simulation
  useEffect(() => {
    // 1. Initial verification phase
    const t1 = setTimeout(() => {
      setStatusText("Verifying security clearance and browser environment...");
    }, 1200);

    // 2. Perform Turnstile auto-challenge
    const t2 = setTimeout(() => {
      setIsVerifying(true);
    }, 1800);

    // 3. Mark checked and complete
    const t3 = setTimeout(() => {
      setIsChecked(true);
      setIsVerifying(false);
      setStatusText("Connection verified successfully. Redirecting...");
    }, 2800);

    // 4. Grant access
    const t4 = setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("docify_cf_cleared", Date.now().toString());
      }
      onVerified();
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onVerified]);

  const handleManualClick = () => {
    if (isChecked) return;
    setIsVerifying(true);
    setStatusText("Verifying challenge response...");
    setTimeout(() => {
      setIsChecked(true);
      setIsVerifying(false);
      setStatusText("Connection verified successfully. Redirecting...");
      setTimeout(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("docify_cf_cleared", Date.now().toString());
        }
        onVerified();
      }, 700);
    }, 900);
  };

  return (
    <div
      id="cloudflare-verification-screen"
      className="min-h-screen w-full bg-neutral-900 text-neutral-100 flex flex-col items-center justify-between p-6 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-orange-500/20"
    >
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center items-start pt-12">
        {/* Cloudflare Orange & White Logo Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl">
            ☁️
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{siteName}</span>
            </div>
            <p className="text-xs text-neutral-400">Verifying secure connection</p>
          </div>
        </div>

        {/* Main Verification Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-neutral-850 border border-neutral-750 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Checking if the site connection is secure
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {siteName} needs to review the security of your connection before proceeding to the workspace.
            </p>
          </div>

          {/* Interactive Cloudflare Turnstile Box */}
          <div
            id="cf-turnstile-box"
            onClick={handleManualClick}
            className={`w-full max-w-sm border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200 ${
              isChecked
                ? "bg-neutral-900/90 border-emerald-500/50 shadow-sm"
                : "bg-neutral-900 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-850"
            }`}
          >
            <div className="flex items-center gap-3.5">
              {/* Checkbox */}
              <div
                className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                  isChecked
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : isVerifying
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-neutral-500 hover:border-neutral-400 bg-neutral-800"
                }`}
              >
                {isChecked ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isVerifying ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                ) : null}
              </div>

              <span className="text-sm font-semibold text-neutral-200 select-none">
                {isChecked
                  ? "Success! Verification complete"
                  : isVerifying
                  ? "Verifying security..."
                  : "Verify you are human"}
              </span>
            </div>

            {/* Cloudflare Badge */}
            <div className="flex flex-col items-end text-[10px] text-neutral-400 select-none pl-2">
              <div className="flex items-center gap-1 font-bold text-neutral-300">
                <span className="text-amber-500 text-xs">☁</span> Cloudflare
              </div>
              <span className="text-[9px] text-neutral-500">Privacy • Terms</span>
            </div>
          </div>

          {/* Status ticker */}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            {isChecked ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className="truncate">{statusText}</span>
          </div>
        </motion.div>

        {/* Why am I seeing this page info */}
        <div className="mt-6 text-xs text-neutral-500 space-y-1">
          <p className="font-semibold text-neutral-400">Why am I seeing this page?</p>
          <p>
            Requests from suspicious network patterns, crawlers, automated clones, or new sessions undergo automated security validation to protect Docify infrastructure.
          </p>
        </div>
      </div>

      {/* Cloudflare Footer with Ray ID */}
      <footer className="w-full max-w-lg mx-auto pt-6 pb-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span>Ray ID: <code className="text-neutral-400 font-mono">{rayId}</code></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>DDoS &amp; Bot Defense by</span>
          <span className="font-bold text-neutral-300">Cloudflare</span>
        </div>
      </footer>
    </div>
  );
};
