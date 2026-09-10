import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  FileText,
  Mail,
  HelpCircle,
  RotateCcw,
  Info,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { getLegalPages, LegalPagesConfig, DEFAULT_LEGAL_PAGES } from "../lib/legalPages";

export type LegalTab = "about" | "contact" | "privacy" | "refund" | "disclaimer";

interface LegalPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalPagesModal: React.FC<LegalPagesModalProps> = ({
  isOpen,
  onClose,
  initialTab = "about",
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [pages, setPages] = useState<LegalPagesConfig>(DEFAULT_LEGAL_PAGES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setLoading(true);
      getLegalPages()
        .then((data) => setPages(data))
        .catch(() => setPages(DEFAULT_LEGAL_PAGES))
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const tabs: { id: LegalTab; label: string; icon: React.ReactNode }[] = [
    { id: "about", label: "About Us", icon: <Info className="w-4 h-4" /> },
    { id: "contact", label: "Contact Us", icon: <Mail className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy Policy", icon: <Shield className="w-4 h-4" /> },
    { id: "refund", label: "Return & Refund Policy", icon: <RotateCcw className="w-4 h-4" /> },
    { id: "disclaimer", label: "Disclaimer", icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="legal-pages-modal"
        className="w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transition-all"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Docify by Jinesh Mehta</span>
                <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
                  • Official Policies
                </span>
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Last updated: {pages.lastUpdated || "September 2026"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto scrollbar-none shrink-0 flex items-center gap-1.5 sm:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm leading-relaxed space-y-4">
          {/* TAB 1: ABOUT US */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 space-y-1">
                <h4 className="font-bold text-blue-950 dark:text-blue-200 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>About Docify</span>
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  Crafted by Jinesh Mehta to automate and simplify college assignment formatting.
                </p>
              </div>

              <div className="whitespace-pre-line text-neutral-700 dark:text-neutral-300 leading-relaxed space-y-2">
                {pages.about}
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT US */}
          {activeTab === "contact" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 space-y-1">
                <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Get in Touch with Support</span>
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  We are here to assist with accounts, billing, Pro plans, technical feedback, or college tie-ups.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-750 space-y-1">
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>Support Email</span>
                  </div>
                  <a
                    href={`mailto:${pages.contactEmail}`}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline block text-sm"
                  >
                    {pages.contactEmail}
                  </a>
                  <p className="text-[11px] text-neutral-400">Official inquiries &amp; feedback</p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-750 space-y-1">
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Working Hours</span>
                  </div>
                  <p className="font-bold text-neutral-900 dark:text-white text-sm">
                    {pages.contactSupportHours}
                  </p>
                  <p className="text-[11px] text-neutral-400">Response within 12–24 hours</p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-750 space-y-1">
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Headquarters / Location</span>
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white text-xs">
                    {pages.contactAddress}
                  </p>
                </div>

                {pages.contactPhone && (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-750 space-y-1">
                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <span>Direct Contact</span>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white text-xs">
                      {pages.contactPhone}
                    </p>
                  </div>
                )}
              </div>

              {pages.contactNotes && (
                <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <p>{pages.contactNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRIVACY POLICY */}
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-1">
                <h4 className="font-bold text-purple-950 dark:text-purple-200 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Privacy Policy &amp; Data Security</span>
                </h4>
                <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                  Your assignments and personal information are protected by strict encryption and Row Level Security.
                </p>
              </div>

              <div className="whitespace-pre-line text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {pages.privacyPolicy}
              </div>
            </div>
          )}

          {/* TAB 4: RETURN & REFUND POLICY */}
          {activeTab === "refund" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                <h4 className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Return &amp; Refund Policy</span>
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Transparent guidelines regarding digital document exports, trial access, and paid plan refunds.
                </p>
              </div>

              <div className="space-y-4 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                <div className="whitespace-pre-line">
                  {pages.returnPolicy}
                </div>
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 whitespace-pre-line">
                  {pages.refundPolicy}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DISCLAIMER */}
          {activeTab === "disclaimer" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                <h4 className="font-bold text-rose-950 dark:text-rose-200 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Academic Integrity &amp; Trademark Disclaimer</span>
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Important notice on responsible academic use and third-party trademarks.
                </p>
              </div>

              <div className="whitespace-pre-line text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {pages.disclaimer}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60 shrink-0 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Docify by Jinesh Mehta &copy; {new Date().getFullYear()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
