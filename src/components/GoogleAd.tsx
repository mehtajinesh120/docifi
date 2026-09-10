import React, { useEffect, useRef } from "react";
import { Sparkles, ExternalLink, ShieldCheck } from "lucide-react";

interface GoogleAdProps {
  slotId?: string;
  format?: "horizontal" | "rectangle" | "processing" | "inline";
  className?: string;
  isPaidUser?: boolean;
}

export const GoogleAd: React.FC<GoogleAdProps> = ({
  slotId = "default-slot",
  format = "horizontal",
  className = "",
  isPaidUser = false,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const adsenseClientId =
    (import.meta as any).env?.VITE_ADSENSE_CLIENT_ID || "";

  // Strictly suppress all ads for Paid / Pro tier users!
  if (isPaidUser) {
    return null;
  }

  useEffect(() => {
    // If real Google AdSense client is supplied, try to push adsbygoogle
    if (adsenseClientId && typeof window !== "undefined") {
      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle && Array.isArray(adsbygoogle)) {
          adsbygoogle.push({});
        }
      } catch (e) {
        // Ads already loaded or adblock active
      }
    }
  }, [adsenseClientId, slotId]);

  // If real AdSense client ID is configured
  if (adsenseClientId) {
    return (
      <div
        id={`ad-container-${slotId}`}
        ref={adRef}
        className={`my-3 overflow-hidden text-center rounded-xl bg-neutral-100 dark:bg-neutral-800/40 p-1 border border-neutral-200/80 dark:border-neutral-800 ${className}`}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
          Advertisement
        </div>
        <ins
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client={adsenseClientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Realistic, highly converting Google Ads Compliant Placeholder Banner
  // Shows real educational sponsor mockups for students and provides clear visual proof
  if (format === "processing") {
    return (
      <div
        id={`ad-proc-${slotId}`}
        className={`w-full p-4 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700 text-white shadow-lg ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2">
          <span className="flex items-center gap-1 text-amber-400">
            <Sparkles className="w-3 h-3" /> Sponsored Partner
          </span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[9px]">
            AD • Google AdSense Ready
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-extrabold text-white">
              Student Cloud Hosting &amp; Developer Tools Pack
            </h4>
            <p className="text-xs text-neutral-300">
              Claim free domain, cloud credits, and IDE subscriptions with student email ID.
            </p>
          </div>
          <a
            href="https://education.github.com/pack"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 transition-colors inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  if (format === "rectangle") {
    return (
      <div
        id={`ad-rect-${slotId}`}
        className={`w-full max-w-[320px] mx-auto p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-center ${className}`}
      >
        <div className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider mb-2">
          Advertisement • Sponsored
        </div>
        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-neutral-900 dark:text-white">
            Grammar &amp; Code Checker Pro
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Zero plagiarism report generator for engineering assignments.
          </p>
          <div className="pt-1">
            <span className="inline-block px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
              Check Assignment Free
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default horizontal banner
  return (
    <div
      id={`ad-banner-${slotId}`}
      className={`w-full max-w-4xl mx-auto my-3 px-3 py-2 sm:py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 text-neutral-800 dark:text-neutral-200 transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[9px] font-black uppercase tracking-wider shrink-0">
            AD
          </span>
          <span className="truncate text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-300">
            <strong className="text-neutral-900 dark:text-white">Prep &amp; Placements:</strong> Top 100 Coding &amp; Interview Questions for CS &amp; IT Engineers.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
            Explore Free Guide &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};
