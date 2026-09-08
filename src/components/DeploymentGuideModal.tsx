import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Cpu,
  Sparkles,
  Server,
  Key,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vercel" | "api_quota" | "render">("vercel");

  if (!isOpen) return null;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const vercelJsonCode = `{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    }
  ]
}`;

  return (
    <div
      id="deployment-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Free Hosting & API Scalability Guide
              </h2>
              <p className="text-xs text-neutral-400">
                Deploy Docify by JineshMehta to Vercel for $0 & support 100+ daily users with free JinAI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-6 pt-2 text-xs font-semibold gap-2">
          <button
            onClick={() => setActiveTab("vercel")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "vercel"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Deploy to Vercel (100% Free)
          </button>
          <button
            onClick={() => setActiveTab("api_quota")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "api_quota"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Free JinAI API for 100+ Users
          </button>
          <button
            onClick={() => setActiveTab("render")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "render"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            1-Click Alternatives (Render / Railway)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-neutral-800 dark:text-neutral-200 text-sm">
          {activeTab === "vercel" && (
            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
                <h3 className="font-bold text-blue-950 dark:text-blue-200 text-sm flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Vercel Free Hobby Tier ($0/month)
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  Vercel gives you 100GB bandwidth, automatic SSL certificates, global CDN, and unlimited deployments for free.
                </p>
              </div>

              {/* Step 1 */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white mb-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-xs">
                    1
                  </span>
                  Push Code to GitHub
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  In your terminal inside the project directory:
                </p>
                <div className="bg-neutral-950 text-neutral-200 font-mono text-xs rounded-lg p-3 relative">
                  <pre className="overflow-x-auto">
{`git init
git add .
git commit -m "Initial commit of Docify by JineshMehta"
git branch -M main
git remote add origin https://github.com/your-username/docify.git
git push -u origin main`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `git init\ngit add .\ngit commit -m "Initial commit of Docify"\ngit branch -M main\ngit remote add origin <your-repo-url>\ngit push -u origin main`,
                        "git"
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Copy commands"
                  >
                    {copiedSection === "git" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white mb-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-xs">
                    2
                  </span>
                  Import to Vercel
                </div>
                <ol className="list-decimal list-inside text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5 leading-relaxed">
                  <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5">vercel.com/new <ExternalLink className="w-3 h-3" /></a> and log in with your GitHub account.</li>
                  <li>Click <strong>Import</strong> next to your <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">docify</code> repository.</li>
                  <li>Vercel automatically detects the Vite framework settings.</li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white mb-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-xs">
                    3
                  </span>
                  Add Environment Variable on Vercel
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  Under <strong>Environment Variables</strong> in the Vercel deploy screen, you ONLY need to add:
                </p>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-bold">KEY: GEMINI_API_KEY</span>
                    <span className="text-neutral-500">VALUE: your_free_api_key_from_google</span>
                  </div>
                </div>

                {/* Explicit Answer to User Question */}
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    💡 Do you need an APP_URL or BASE_URL variable?
                  </p>
                  <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    <strong>No, remove it!</strong> You do NOT need any <code className="font-mono bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded">APP_URL</code>, <code className="font-mono bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded">BASE_URL</code>, or domain variables on Vercel.
                    Docify uses native relative endpoints (e.g. <code className="font-mono bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded">/api/extract-questions</code>), which automatically resolve to your Vercel URL on any domain.
                  </p>
                </div>

                <p className="text-xs text-neutral-500 mt-3">
                  Click <strong>Deploy</strong>. In ~45 seconds, your app will be live with a free custom <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">*.vercel.app</code> domain!
                </p>
              </div>
            </div>
          )}

          {activeTab === "api_quota" && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
                <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Free JinAI / Google AI Studio Free Quota Capacity
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Google provides a 100% free tier for developers with zero credit card required. Here is the exact mathematical breakdown of how 100+ students are easily supported every day.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 bg-neutral-50/50 dark:bg-neutral-800/40 text-center">
                  <div className="text-xl font-bold text-blue-600">1,500</div>
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Requests / Day</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">100% Free Forever</div>
                </div>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 bg-neutral-50/50 dark:bg-neutral-800/40 text-center">
                  <div className="text-xl font-bold text-indigo-600">15 RPM</div>
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Requests / Minute</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Auto-throttled in batches</div>
                </div>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 bg-neutral-50/50 dark:bg-neutral-800/40 text-center">
                  <div className="text-xl font-bold text-emerald-600">1 Million</div>
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Tokens / Minute</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Docify uses ~2k/request</div>
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Capacity Math for 100+ Students Daily:
                </h4>
                <ul className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li><strong>Question Parsing:</strong> 1 request per assignment.</li>
                  <li><strong>Screenshot Matching:</strong> Docify batches up to 8 images per call with 900px downscaling. For 20 screenshots, that is only 2-3 requests.</li>
                  <li><strong>Total per Student:</strong> ~3 to 4 API requests total.</li>
                  <li><strong>100 Daily Students:</strong> 100 × 4 = <strong>400 requests/day</strong>.</li>
                  <li><strong>Your Quota Margin:</strong> 400 used out of 1,500 daily quota = <strong>Only 26% of your daily limit!</strong> You have room for up to <strong>350+ users per day</strong> without paying a single rupee or dollar.</li>
                </ul>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">Need an API Key?</p>
                  <p className="text-[11px] text-neutral-500">Generate your free permanent API key in 1 click</p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {activeTab === "render" && (
            <div className="space-y-4">
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40">
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm mb-2">
                  Option B: Render.com (Easiest Full-Stack Server Deployment)
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 leading-relaxed">
                  Render natively runs Express Node.js servers with zero config.
                </p>
                <ol className="list-decimal list-inside text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5">
                  <li>Create a free account on <a href="https://render.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Render.com</a>.</li>
                  <li>Click <strong>New +</strong> &gt; <strong>Web Service</strong>.</li>
                  <li>Connect your GitHub repo.</li>
                  <li>Set <strong>Build Command</strong>: <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">npm run build</code></li>
                  <li>Set <strong>Start Command</strong>: <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">npm start</code></li>
                  <li>Add Environment Variable: <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">GEMINI_API_KEY</code></li>
                  <li>Click <strong>Create Web Service</strong>.</li>
                </ol>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40">
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm mb-2">
                  Option C: Railway / Koyeb
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Both Railway.app and Koyeb.com have free starter tiers. Simply link your GitHub repo and add <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in their environment variables dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 dark:bg-neutral-950 px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <span>Configured for Docify by JineshMehta</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
