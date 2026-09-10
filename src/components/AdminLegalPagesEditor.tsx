import React, { useState } from "react";
import {
  FileText,
  Mail,
  ShieldAlert,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  HelpCircle,
  Phone,
  Clock,
  MapPin,
} from "lucide-react";
import { LegalPagesConfig, saveLegalPages, DEFAULT_LEGAL_PAGES } from "../lib/legalPages";

interface AdminLegalPagesEditorProps {
  initialConfig: LegalPagesConfig;
  onSaved: (config: LegalPagesConfig) => void;
}

export const AdminLegalPagesEditor: React.FC<AdminLegalPagesEditorProps> = ({
  initialConfig,
  onSaved,
}) => {
  const [config, setConfig] = useState<LegalPagesConfig>(initialConfig);
  const [activeSection, setActiveSection] = useState<"about" | "contact" | "privacy" | "refund" | "disclaimer">("about");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedConfig: LegalPagesConfig = {
        ...config,
        lastUpdated: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      };
      const ok = await saveLegalPages(updatedConfig);
      if (ok) {
        setConfig(updatedConfig);
        onSaved(updatedConfig);
        setSuccessMessage("All legal policies & contact details updated and saved to Supabase database! These changes are immediately active for all students and visitors.");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage("Failed to save legal pages. Please check database connection.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save legal pages to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all legal text and policies to standard defaults?")) {
      setConfig(DEFAULT_LEGAL_PAGES);
    }
  };

  return (
    <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">
              Legal, Policy &amp; Contact Pages (Live Database)
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Edit policies, contact addresses, and academic disclaimers. Saved in Supabase <code>system_config</code> table.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-neutral-700 flex items-center gap-1.5"
            title="Reset text fields to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving to Database..." : "Save All to Supabase"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveSection("about")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSection === "about"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>About Us</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("contact")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSection === "contact"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Mail className="w-3.5 h-3.5 text-emerald-400" />
          <span>Contact &amp; Support</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("privacy")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSection === "privacy"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span>Privacy Policy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("refund")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSection === "refund"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Return &amp; Refund Policy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("disclaimer")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSection === "disclaimer"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow-xs"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Disclaimer</span>
        </button>
      </div>

      {/* SECTION 1: ABOUT US */}
      {activeSection === "about" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              About Page Heading
            </label>
            <input
              type="text"
              value={config.about.title}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  about: { ...prev.about, title: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Mission Statement / Subheading
            </label>
            <input
              type="text"
              value={config.about.mission}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  about: { ...prev.about, mission: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              About Content (Paragraphs)
            </label>
            <textarea
              rows={6}
              value={config.about.content}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  about: { ...prev.about, content: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Creator / Engineering Credits
            </label>
            <input
              type="text"
              value={config.about.creator}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  about: { ...prev.about, creator: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* SECTION 2: CONTACT & SUPPORT */}
      {activeSection === "contact" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Support Email Address</span>
            </label>
            <input
              type="email"
              value={config.contact.email}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, email: e.target.value },
                }))
              }
              placeholder="e.g. jineshgamer120@gmail.com"
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>Phone / WhatsApp Support</span>
            </label>
            <input
              type="text"
              value={config.contact.phone}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, phone: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Operating / Support Hours</span>
            </label>
            <input
              type="text"
              value={config.contact.hours}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, hours: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Office / University Campus Address</span>
            </label>
            <input
              type="text"
              value={config.contact.address}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, address: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
              <span>Notes for Students &amp; Contact Guidance</span>
            </label>
            <textarea
              rows={3}
              value={config.contact.notes}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, notes: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* SECTION 3: PRIVACY POLICY */}
      {activeSection === "privacy" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Privacy Summary (Short Description)
            </label>
            <input
              type="text"
              value={config.privacyPolicy.summary}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  privacyPolicy: { ...prev.privacyPolicy, summary: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Full Privacy Policy Content
            </label>
            <textarea
              rows={12}
              value={config.privacyPolicy.content}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  privacyPolicy: { ...prev.privacyPolicy, content: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SECTION 4: RETURN & REFUND POLICY */}
      {activeSection === "refund" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Return &amp; Digital Cancellation Policy
            </label>
            <textarea
              rows={6}
              value={config.refundPolicy.returnPolicy}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  refundPolicy: { ...prev.refundPolicy, returnPolicy: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Refund Eligibility &amp; Processing Policy
            </label>
            <textarea
              rows={6}
              value={config.refundPolicy.refundEligibility}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  refundPolicy: { ...prev.refundPolicy, refundEligibility: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SECTION 5: DISCLAIMER */}
      {activeSection === "disclaimer" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Academic Disclaimer &amp; Fair Use Policy
            </label>
            <textarea
              rows={8}
              value={config.disclaimer.content}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  disclaimer: { ...prev.disclaimer, content: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Student Integrity Guidelines
            </label>
            <textarea
              rows={5}
              value={config.disclaimer.guidelines}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  disclaimer: { ...prev.disclaimer, guidelines: e.target.value },
                }))
              }
              className="w-full px-3.5 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Bottom Save Action */}
      <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
        <span className="text-[11px] text-neutral-500">
          Last Synchronized: {config.lastUpdated || "Live Supabase"}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving to Database..." : "Save All Changes to Database"}</span>
        </button>
      </div>
    </div>
  );
};
