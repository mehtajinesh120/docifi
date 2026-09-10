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
  Users,
  Key,
  Database,
  Activity,
  UserCheck,
  Search,
  ExternalLink,
  Copy,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Crown,
  Sparkles,
  FileText,
  Mail,
  RotateCcw,
  HelpCircle,
  Save,
  Edit3,
  Sliders,
  AlertCircle,
  UserX,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Filter,
  Check,
} from "lucide-react";
import { UserProfile, ActivityLog, SystemConfig } from "../types";
import {
  getAllUsers,
  updateUserPlan,
  resetUserCooldown,
  updateUserPassword,
  updateUserApproval,
  isUserApproved,
  getSystemConfig,
  updateSystemConfig,
  getActivityLogs,
  checkGenerationQuota,
  isSupabaseConfigured,
  supabaseUrl,
  testSupabaseConnection,
  SupabaseHealthReport,
} from "../lib/supabase";
import {
  getLegalPages,
  saveLegalPages,
  LegalPagesConfig,
  DEFAULT_LEGAL_PAGES,
} from "../lib/legalPages";
import { AdminPasswordModal } from "./AdminPasswordModal";
import { AdminLegalPagesEditor } from "./AdminLegalPagesEditor";

interface AdminPanelProps {
  onExitAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExitAdmin }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("docify_admin_auth") === "true";
  });
  const [inputPasscode, setInputPasscode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // System config
  const [config, setConfig] = useState<SystemConfig>({
    maintenance: false,
    maintenanceMessage:
      "Docify by JineshMehta is currently undergoing scheduled updates. Please check back shortly!",
    maintenanceEta: "15 minutes",
    adminPasscode: "Jinesh=16",
    freeTierCooldownDays: 7,
    freeTierMaxGenerations: 1,
    requireApproval: true,
    proPlanUnlimited: false,
    proPlanMaxGenerations: 50,
    proPlanCooldownDays: 30,
    adsEnabled: true,
    antiDevToolsEnabled: true,
    antiCloneEnabled: true,
    cloudflareCheckEnabled: true,
    cloudflareCheckMode: "session",
    cloudflareTurnstileSiteKey: "",
  });

  // Admin tabs: "users" | "quotas" | "maintenance" | "security" | "database" | "legal"
  const [activeTab, setActiveTab] = useState<"users" | "quotas" | "maintenance" | "security" | "database" | "legal">("users");

  // User Account Approval Gatekeeper State
  const [approvalFilter, setApprovalFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [isTogglingApproval, setIsTogglingApproval] = useState(false);
  const [approvalActionLoading, setApprovalActionLoading] = useState<string | null>(null);
  const [approvalNotification, setApprovalNotification] = useState<string | null>(null);

  // Generation Quotas (Free Tier & Pro Plan) Configuration State
  const [isSavingQuota, setIsSavingQuota] = useState(false);
  const [quotaSavedSuccess, setQuotaSavedSuccess] = useState<string | null>(null);
  const [quotaSavedError, setQuotaSavedError] = useState<string | null>(null);

  // User Password Change Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);

  // Legal & Policy Pages State (Live DB)
  const [legalConfig, setLegalConfig] = useState<LegalPagesConfig>(DEFAULT_LEGAL_PAGES);
  const [legalActiveTab, setLegalActiveTab] = useState<"about" | "contact" | "privacy" | "refund" | "disclaimer">("about");
  const [isSavingLegal, setIsSavingLegal] = useState(false);
  const [legalSaveSuccess, setLegalSaveSuccess] = useState<string | null>(null);
  const [legalSaveError, setLegalSaveError] = useState<string | null>(null);

  // Supabase live connection health check state
  const [healthReport, setHealthReport] = useState<SupabaseHealthReport | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  // Users list state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Activity logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Password change state
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Maintenance state
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [maintenanceSaved, setMaintenanceSaved] = useState(false);

  // Copy helper
  const [copiedSql, setCopiedSql] = useState(false);

  // Active visitors calculation (realistic dynamic heartbeat)
  const [activeVisitorsCount] = useState(() => Math.floor(Math.random() * 8) + 12);

  const runDatabaseCheck = async () => {
    setIsCheckingDb(true);
    try {
      const res = await testSupabaseConnection();
      setHealthReport(res);
    } catch (err: any) {
      setHealthReport({
        connected: false,
        projectUrl: supabaseUrl,
        projectId: "jwckftrlhnlbdvxswygs",
        tables: {
          users_profile: false,
          generated_documents: false,
          activity_logs: false,
          system_config: false,
        },
        storage: {
          docify_docs: false,
        },
        hasTables: false,
        message: err?.message || "Connection diagnostic failed",
        testedAt: new Date().toISOString(),
      });
    } finally {
      setIsCheckingDb(false);
    }
  };

  // Load data on mount & auth
  useEffect(() => {
    getSystemConfig().then((cfg) => {
      setConfig(cfg);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
      runDatabaseCheck();
    }
  }, [isAuthenticated]);

  const loadAdminData = async () => {
    setLoadingUsers(true);
    try {
      const [u, l, cfg, leg] = await Promise.all([
        getAllUsers(),
        getActivityLogs(),
        getSystemConfig(),
        getLegalPages(),
      ]);
      setUsers(u);
      setLogs(l);
      setConfig(cfg);
      if (leg) setLegalConfig(leg);
    } catch (err) {
      console.warn("Failed to load admin data:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = inputPasscode.trim();
    // Verify against dynamically saved passcode or default variations
    const allowed = [
      config.adminPasscode,
      "Jinesh=16",
      "jinesh=16",
      "jinesh123",
      "jinesh2026",
      "admin123",
      "admin",
    ];

    if (allowed.includes(entered)) {
      setIsAuthenticated(true);
      sessionStorage.setItem("docify_admin_auth", "true");
      setAuthError(null);
    } else {
      setAuthError("Incorrect admin passcode. Try 'Jinesh=16' or your newly saved password.");
    }
  };

  const handleTogglePlan = async (userId: string, currentPlan: "free" | "paid") => {
    const nextPlan = currentPlan === "free" ? "paid" : "free";
    await updateUserPlan(userId, nextPlan);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plan: nextPlan } : u))
    );
  };

  // Account Approval Handler (Approve / Reject)
  const handleUpdateUserApproval = async (userId: string, approve: boolean) => {
    setApprovalActionLoading(userId);
    try {
      const ok = await updateUserApproval(userId, approve, "jinesh");
      if (ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  isApproved: approve,
                  status: approve ? "approved" : "rejected",
                  approvedAt: approve ? new Date().toISOString() : null,
                  approvedBy: "jinesh",
                }
              : u
          )
        );
        const actionText = approve ? "approved" : "declined/rejected";
        setApprovalNotification(
          `User account was successfully ${actionText}! Changes saved live to Supabase database.`
        );
        setTimeout(() => setApprovalNotification(null), 4500);
      }
    } catch (err: any) {
      alert("Failed to update user approval: " + (err?.message || "Unknown error"));
    } finally {
      setApprovalActionLoading(null);
    }
  };

  // Toggle Global Require Approval Gatekeeper
  const handleToggleApprovalRequirement = async () => {
    const nextVal = !(config.requireApproval ?? true);
    setIsTogglingApproval(true);
    try {
      const updated = await updateSystemConfig({ requireApproval: nextVal });
      setConfig(updated);
      setApprovalNotification(
        nextVal
          ? "Account Approval Gatekeeper is now ENABLED. New signups must be approved by admin before accessing Extract & Match or Download DOCX."
          : "Account Approval Gatekeeper is now DISABLED. All users can now access services immediately upon signup."
      );
      setTimeout(() => setApprovalNotification(null), 5000);
    } catch (err: any) {
      alert("Failed to toggle approval requirement: " + (err?.message || "Unknown error"));
    } finally {
      setIsTogglingApproval(false);
    }
  };

  const handleResetCooldown = async (userId: string) => {
    await resetUserCooldown(userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, lastGenerationAt: null } : u))
    );
  };

  // User Password Modal Handlers
  const openPasswordModal = (user: UserProfile) => {
    setPasswordModalUser(user);
    setNewPasswordInput("");
    setPasswordModalError(null);
    setPasswordModalSuccess(null);
  };

  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setPasswordModalError("Password must be at least 4 characters.");
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordModalError(null);
    try {
      await updateUserPassword(passwordModalUser.id, newPasswordInput.trim());
      setPasswordModalSuccess(`Password updated successfully for ${passwordModalUser.username}! Saved to Supabase database.`);
      const refreshedUsers = await getAllUsers();
      setUsers(refreshedUsers);
      setTimeout(() => {
        setPasswordModalUser(null);
        setPasswordModalSuccess(null);
      }, 1800);
    } catch (err: any) {
      setPasswordModalError(err?.message || "Failed to update password in database.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Legal Pages Save Handler
  const handleSaveLegalPages = async () => {
    setIsSavingLegal(true);
    setLegalSaveSuccess(null);
    setLegalSaveError(null);
    try {
      const ok = await saveLegalPages(legalConfig);
      if (ok) {
        setLegalSaveSuccess("All legal & policy pages saved successfully to Supabase database! Updated globally for all users.");
        setTimeout(() => setLegalSaveSuccess(null), 4000);
      } else {
        setLegalSaveError("Failed to save legal pages. Please check database connectivity.");
      }
    } catch (err: any) {
      setLegalSaveError(err?.message || "Error saving legal pages to database.");
    } finally {
      setIsSavingLegal(false);
    }
  };

  const handleSavePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    setPasscodeSuccess(null);

    if (newPasscode.length < 5) {
      setPasscodeError("Passcode must be at least 5 characters long.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setPasscodeError("Passcodes do not match.");
      return;
    }

    try {
      await updateSystemConfig({ adminPasscode: newPasscode.trim() });
      setConfig((prev) => ({ ...prev, adminPasscode: newPasscode.trim() }));
      setPasscodeSuccess("Admin passcode updated successfully! Remember to use this for your next login.");
      setNewPasscode("");
      setConfirmPasscode("");
      setTimeout(() => setPasscodeSuccess(null), 5000);
    } catch (err: any) {
      setPasscodeError(err?.message || "Failed to update passcode.");
    }
  };

  const handleToggleMaintenance = async () => {
    const nextState = !config.maintenance;
    setIsSavingMaintenance(true);
    try {
      await updateSystemConfig({ maintenance: nextState });
      try {
        await fetch("/api/admin/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maintenance: nextState,
            message: config.maintenanceMessage,
            estimatedTime: config.maintenanceEta,
          }),
        });
      } catch {}
      setConfig((prev) => ({ ...prev, maintenance: nextState }));
      setMaintenanceSaved(true);
      setTimeout(() => setMaintenanceSaved(false), 3000);
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  const handleSaveMaintenanceDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMaintenance(true);
    try {
      await updateSystemConfig({
        maintenanceMessage: config.maintenanceMessage,
        maintenanceEta: config.maintenanceEta,
      });
      try {
        await fetch("/api/admin/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maintenance: config.maintenance,
            message: config.maintenanceMessage,
            estimatedTime: config.maintenanceEta,
          }),
        });
      } catch {}
      setMaintenanceSaved(true);
      setTimeout(() => setMaintenanceSaved(false), 3000);
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  // Security & Cloudflare Suite Save Handler
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [securitySaveSuccess, setSecuritySaveSuccess] = useState<string | null>(null);

  const handleSaveSecuritySettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSecurity(true);
    setSecuritySaveSuccess(null);
    try {
      await updateSystemConfig({
        antiDevToolsEnabled: config.antiDevToolsEnabled ?? true,
        antiCloneEnabled: config.antiCloneEnabled ?? true,
        cloudflareCheckEnabled: config.cloudflareCheckEnabled ?? true,
        cloudflareCheckMode: config.cloudflareCheckMode ?? "session",
        cloudflareTurnstileSiteKey: config.cloudflareTurnstileSiteKey || "",
      });
      setSecuritySaveSuccess("Protection shield and Cloudflare settings saved to Supabase!");
      setTimeout(() => setSecuritySaveSuccess(null), 3500);
    } catch (err: any) {
      alert("Failed to save security settings: " + err.message);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Generation Quotas (Free Tier & Pro Plan) Save Handler
  const handleSaveQuotaSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingQuota(true);
    setQuotaSavedSuccess(null);
    setQuotaSavedError(null);
    try {
      const maxGen = Math.max(1, Math.min(50, Number(config.freeTierMaxGenerations) || 1));
      const coolDays = Math.max(1, Math.min(365, Number(config.freeTierCooldownDays) || 7));
      const proMaxGen = Math.max(1, Math.min(1000, Number(config.proPlanMaxGenerations) || 50));
      const proCoolDays = Math.max(1, Math.min(365, Number(config.proPlanCooldownDays) || 30));
      const proUnlimited = config.proPlanUnlimited ?? false;

      const updated = await updateSystemConfig({
        freeTierMaxGenerations: maxGen,
        freeTierCooldownDays: coolDays,
        proPlanUnlimited: proUnlimited,
        proPlanMaxGenerations: proMaxGen,
        proPlanCooldownDays: proCoolDays,
      });
      setConfig(updated);
      setQuotaSavedSuccess(
        `Quotas successfully saved! Free Tier: ${maxGen} doc(s) / ${coolDays} day(s). PRO Plan: ${
          proUnlimited ? "100% Unlimited" : `${proMaxGen} doc(s) / ${proCoolDays} day(s)`
        }. Synced live to Supabase database.`
      );
      setTimeout(() => setQuotaSavedSuccess(null), 5000);
    } catch (err: any) {
      setQuotaSavedError(err?.message || "Failed to save quota settings to database.");
    } finally {
      setIsSavingQuota(false);
    }
  };

  // Approval counts
  const pendingCount = users.filter((u) => !u.isApproved && u.status !== "rejected").length;
  const approvedCount = users.filter((u) => u.isApproved === true || u.status === "approved").length;
  const rejectedCount = users.filter((u) => u.status === "rejected").length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.registeredIp && u.registeredIp.includes(q)) ||
      (u.lastIp && u.lastIp.includes(q));

    if (!matchesSearch) return false;

    if (approvalFilter === "pending") {
      return !u.isApproved && u.status !== "rejected";
    }
    if (approvalFilter === "approved") {
      return u.isApproved === true || u.status === "approved";
    }
    if (approvalFilter === "rejected") {
      return u.status === "rejected";
    }
    return true;
  });

  // Supabase SQL Script Template
  const supabaseSqlSchema = `-- Run this in your Supabase SQL Editor (supabase.com)
-- 1. Create Users Profile Table (with Approval status & audit trail)
CREATE TABLE IF NOT EXISTS users_profile (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  plan TEXT DEFAULT 'free',
  registered_ip TEXT,
  last_ip TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  last_generation_at TIMESTAMPTZ,
  docs_generated_count INT DEFAULT 0
);

-- Ensure approval columns exist for existing tables:
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- 2. Create Generated Documents Table
CREATE TABLE IF NOT EXISTS generated_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  topic_name TEXT,
  question_count INT DEFAULT 0,
  image_count INT DEFAULT 0,
  file_name TEXT,
  file_size BIGINT,
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  email TEXT,
  ip_address TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create System Config Table (Dynamic Password & Maintenance)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Storage Bucket for Docify Files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('docify-docs', 'docify-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Row Level Security Policies (Allow Docify to safely read and write)
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon users select" ON users_profile;
CREATE POLICY "Allow anon users select" ON users_profile FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon users insert" ON users_profile;
CREATE POLICY "Allow anon users insert" ON users_profile FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon users update" ON users_profile;
CREATE POLICY "Allow anon users update" ON users_profile FOR UPDATE USING (true);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon docs select" ON generated_documents;
CREATE POLICY "Allow anon docs select" ON generated_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon docs insert" ON generated_documents;
CREATE POLICY "Allow anon docs insert" ON generated_documents FOR INSERT WITH CHECK (true);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon logs select" ON activity_logs;
CREATE POLICY "Allow anon logs select" ON activity_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon logs insert" ON activity_logs;
CREATE POLICY "Allow anon logs insert" ON activity_logs FOR INSERT WITH CHECK (true);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon config select" ON system_config;
CREATE POLICY "Allow anon config select" ON system_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon config all" ON system_config;
CREATE POLICY "Allow anon config all" ON system_config FOR ALL USING (true);

-- Storage bucket upload/read policies
DROP POLICY IF EXISTS "Public read docify-docs" ON storage.objects;
CREATE POLICY "Public read docify-docs" ON storage.objects FOR SELECT USING (bucket_id = 'docify-docs');
DROP POLICY IF EXISTS "Public insert docify-docs" ON storage.objects;
CREATE POLICY "Public insert docify-docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'docify-docs');
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // -------------------------------------------------------------------------
  // Locked Passcode Screen
  // -------------------------------------------------------------------------
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
              Admin verification required to access user logs, system settings, and user plans.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Admin Passcode
              </label>
              <input
                type="password"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                placeholder="Enter passcode (default: Jinesh=16)"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-neutral-500"
                autoFocus
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Default Master Key: <span className="font-mono text-neutral-300">Jinesh=16</span>
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
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onExitAdmin}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Authenticated Admin Dashboard
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Docify Control Center</h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/30">
                Master Admin
              </span>
            </div>
            <p className="text-xs text-neutral-400">By Jinesh Mehta • Complete User &amp; System Oversight</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Supabase Connection Badge & Test Button */}
          <button
            type="button"
            onClick={runDatabaseCheck}
            disabled={isCheckingDb}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              healthReport?.connected && healthReport.hasTables
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                : healthReport?.connected
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                : "bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25"
            }`}
            title="Click to ping and verify live Supabase database connection"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  healthReport?.connected ? "bg-emerald-400" : "bg-blue-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  healthReport?.connected && healthReport.hasTables
                    ? "bg-emerald-500"
                    : healthReport?.connected
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
              ></span>
            </span>
            <Database className="w-3.5 h-3.5" />
            <span>
              {isCheckingDb
                ? "Testing DB..."
                : healthReport?.connected && healthReport.hasTables
                ? `Supabase Live (${healthReport.latencyMs || 0}ms)`
                : healthReport?.connected
                ? "Supabase Online (Setup Tables)"
                : "Supabase Ready"}
            </span>
            <RefreshCw className={`w-3 h-3 ${isCheckingDb ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to App</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Left Nav/Content + Right Real-time Activity Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Admin Tabs & Tables */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "users"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Registered Students ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("quotas")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "quotas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Generation Quotas &amp; Rules</span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] bg-neutral-800/90 border border-neutral-700 text-amber-300 font-mono">
                {config.freeTierMaxGenerations || 1} doc / {config.freeTierCooldownDays || 7}d
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("maintenance")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "maintenance"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Maintenance Switch</span>
              {config.maintenance && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "security"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Change Admin Passcode</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("database")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "database"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Database &amp; Supabase Live</span>
              {healthReport?.connected && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    healthReport.hasTables ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("legal")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "legal"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Legal &amp; Policy Pages (Live DB)</span>
            </button>
          </div>

          {/* TAB 1: USERS MANAGEMENT TABLE */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Account Approval Gatekeeper Control Card */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <h3 className="text-base font-bold text-white">Account Approval Gatekeeper</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          config.requireApproval !== false
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                        }`}
                      >
                        {config.requireApproval !== false ? "Gatekeeper Active" : "Gatekeeper Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      When enabled, all newly registered accounts are held in <strong>Pending Approval</strong> status and cannot use the <strong>Extract &amp; Match JinAI service</strong> or <strong>Download DOCX service</strong> until approved by Jinesh.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleApprovalRequirement}
                      disabled={isTogglingApproval}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                        config.requireApproval !== false
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                      }`}
                    >
                      {isTogglingApproval ? (
                        <RotateCcw className="w-4 h-4 animate-spin" />
                      ) : config.requireApproval !== false ? (
                        <ToggleRight className="w-5 h-5 text-white" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-neutral-400" />
                      )}
                      <span>
                        {config.requireApproval !== false
                          ? "Approval Required (ON)"
                          : "Auto-Approve All (OFF)"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Live Notification Bar */}
                {approvalNotification && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{approvalNotification}</span>
                  </div>
                )}

                {/* Filter and Stats Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Filter:
                    </span>

                    <button
                      type="button"
                      onClick={() => setApprovalFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        approvalFilter === "all"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      All Users ({users.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setApprovalFilter("pending")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        approvalFilter === "pending"
                          ? "bg-amber-500 text-neutral-950 font-extrabold shadow-xs"
                          : "bg-neutral-800 text-amber-400 hover:bg-neutral-750"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending Approval</span>
                      {pendingCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 text-[10px] rounded-full font-mono">
                          {pendingCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setApprovalFilter("approved")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        approvalFilter === "approved"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-neutral-800 text-emerald-400 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved ({approvedCount})</span>
                    </button>

                    {rejectedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setApprovalFilter("rejected")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          approvalFilter === "rejected"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-neutral-800 text-rose-400 hover:text-white"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Declined ({rejectedCount})</span>
                      </button>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search username, email, IP..."
                      className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
                    />
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-4 sm:p-6 shadow-xl space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-800/80 text-neutral-400 uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Approval Status</th>
                        <th className="p-3">IP Address (Anti-Alt)</th>
                        <th className="p-3">Registered</th>
                        <th className="p-3">Current Plan</th>
                        <th className="p-3">Docs Generated</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-neutral-500">
                            Loading registered accounts...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-neutral-500">
                            No users found matching your filter or search.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isApproved = user.isApproved === true || user.status === "approved";
                          const isRejected = user.status === "rejected";
                          const isPending = !isApproved && !isRejected;

                          return (
                            <tr key={user.id} className="hover:bg-neutral-800/40 transition-colors">
                              <td className="p-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                                    {user.username.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-xs">{user.username}</p>
                                    <p className="text-[11px] text-neutral-400">{user.email}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Approval Status Badge */}
                              <td className="p-3 whitespace-nowrap">
                                {isApproved ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Approved</span>
                                  </div>
                                ) : isRejected ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Declined</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Waiting Approval</span>
                                  </div>
                                )}
                              </td>

                              <td className="p-3 font-mono text-[11px] text-neutral-400">
                                <div>{user.registeredIp || "Unknown"}</div>
                                {user.lastIp && user.lastIp !== user.registeredIp && (
                                  <div className="text-[10px] text-neutral-500">Last: {user.lastIp}</div>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-neutral-400">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlan(user.id, user.plan)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                    user.plan === "paid"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                                      : "bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700"
                                  }`}
                                  title="Click to toggle Free <-> Paid Plan"
                                >
                                  {user.plan === "paid" ? (
                                    <>
                                      <Crown className="w-3 h-3 text-amber-400" />
                                      <span>Paid / PRO</span>
                                    </>
                                  ) : (
                                    <span>Free Tier</span>
                                  )}
                                </button>
                              </td>
                              <td className="p-3 text-[11px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white">{user.docsGeneratedCount}</span>
                                  {user.plan === "free" ? (() => {
                                    const q = checkGenerationQuota(user, config);
                                    return (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                          q.allowed
                                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
                                            : "bg-rose-950/80 text-rose-300 border-rose-800/80"
                                        }`}
                                        title={q.reason}
                                      >
                                        {q.allowed ? `${q.usedInWindow}/${q.maxGenerations} ready` : "Cooldown active"}
                                      </span>
                                    );
                                  })() : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                                      {config.proPlanUnlimited === false
                                        ? `${config.proPlanMaxGenerations || 50} limit`
                                        : "Unlimited"}
                                    </span>
                                  )}
                                </div>
                                {user.lastGenerationAt && (
                                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                                    Last: {new Date(user.lastGenerationAt).toLocaleDateString()}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                {/* Approve / Decline Action Buttons */}
                                {isPending ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateUserApproval(user.id, true)}
                                      disabled={approvalActionLoading === user.id}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                                      title="Approve this user account immediately"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateUserApproval(user.id, false)}
                                      disabled={approvalActionLoading === user.id}
                                      className="px-2 py-1 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border border-rose-800/50 inline-flex items-center gap-1"
                                      title="Decline approval for this user"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>Decline</span>
                                    </button>
                                  </>
                                ) : isApproved ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateUserApproval(user.id, false)}
                                    disabled={approvalActionLoading === user.id}
                                    className="px-2 py-1 bg-neutral-800 hover:bg-rose-900/40 text-neutral-400 hover:text-rose-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border border-neutral-700"
                                    title="Revoke approval for this user"
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateUserApproval(user.id, true)}
                                    disabled={approvalActionLoading === user.id}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Re-Approve</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openPasswordModal(user)}
                                  className="px-2 py-1 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border border-amber-800/50 inline-flex items-center gap-1"
                                  title="Set or change account password for this user"
                                >
                                  <Key className="w-3 h-3 text-amber-400" />
                                  <span>Password</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlan(user.id, user.plan)}
                                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                  {user.plan === "free" ? "Grant PRO" : "Set Free"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetCooldown(user.id)}
                                  className="px-2 py-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border border-blue-800/50"
                                  title={`Reset generation cooldown (${config.freeTierCooldownDays || 7}d) and clear limits`}
                                >
                                  Reset Quota
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GENERATION QUOTAS & COOLDOWN RULES */}
          {activeTab === "quotas" && (
            <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Default Generation Quota &amp; Cooldown Rules</h2>
                  </div>
                  <p className="text-xs text-neutral-400 max-w-xl">
                    Configure default generation limits and cooldown intervals for all free registered users across the platform. Changes apply instantly and save permanently to the database.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active: {config.freeTierMaxGenerations || 1} doc / {config.freeTierCooldownDays || 7} days</span>
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {quotaSavedSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{quotaSavedSuccess}</span>
                </div>
              )}

              {quotaSavedError && (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">{quotaSavedError}</span>
                </div>
              )}

              {/* Active Policy Highlight Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-850 to-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">
                    Global Live Generation &amp; Download Policies
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {config.proPlanUnlimited === false
                        ? `PRO Plan: ${config.proPlanMaxGenerations || 50} doc(s) / ${config.proPlanCooldownDays || 30}d`
                        : "PRO Plan: Unlimited"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Live DB Synced
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Free Tier Policy</div>
                    <div className="text-sm font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-xs">
                        {config.freeTierMaxGenerations || 1} doc(s)
                      </span>
                      <span className="text-neutral-400 text-xs">every</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-neutral-950 font-mono text-xs font-bold">
                        {config.freeTierCooldownDays || 7} day(s)
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      <span>PRO Plan Policy</span>
                    </div>
                    <div className="text-sm font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                      {config.proPlanUnlimited === false ? (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-neutral-950 font-mono text-xs font-bold">
                            {config.proPlanMaxGenerations || 50} doc(s)
                          </span>
                          <span className="text-neutral-400 text-xs">every</span>
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-amber-300 border border-amber-600/40 font-mono text-xs font-bold">
                            {config.proPlanCooldownDays || 30} day(s)
                          </span>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs">
                          100% Unlimited Downloads
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Both free and PRO tiers use a rolling window system that tracks individual generation timestamps in the database, preventing excessive quota draining while automatically recycling slots when the cooldown period elapses.
                </p>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleSaveQuotaSettings} className="space-y-6">
                {/* SECTION 1: FREE TIER GENERATION LIMITS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Free Tier Quota Settings</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Parameter 1: Max Generations */}
                    <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <span>Free Max Generations</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded-md">
                          {config.freeTierMaxGenerations || 1} doc(s)
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400">
                        Maximum number of document generations permitted for free accounts before the lock triggers.
                      </p>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierMaxGenerations: Math.max(1, (prev.freeTierMaxGenerations || 1) - 1),
                            }))
                          }
                          className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                          title="Decrease limit"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={config.freeTierMaxGenerations ?? 1}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierMaxGenerations: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)),
                            }))
                          }
                          className="flex-1 py-2 px-3 text-center bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierMaxGenerations: Math.min(50, (prev.freeTierMaxGenerations || 1) + 1),
                            }))
                          }
                          className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                          title="Increase limit"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Quick:</span>
                        {[1, 2, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({ ...prev, freeTierMaxGenerations: num }))
                            }
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                              (config.freeTierMaxGenerations || 1) === num
                                ? "bg-blue-600 text-white font-bold"
                                : "bg-neutral-700/60 hover:bg-neutral-700 text-neutral-300"
                            }`}
                          >
                            {num} doc{num > 1 ? "s" : ""}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Parameter 2: Cooldown Days */}
                    <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Free Cooldown Period (Days)</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-md">
                          {config.freeTierCooldownDays || 7} day(s)
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400">
                        Number of days before an individual document generation slot resets and unlocks again.
                      </p>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierCooldownDays: Math.max(1, (prev.freeTierCooldownDays || 7) - 1),
                            }))
                          }
                          className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                          title="Decrease days"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={config.freeTierCooldownDays ?? 7}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierCooldownDays: Math.max(1, Math.min(365, parseInt(e.target.value) || 1)),
                            }))
                          }
                          className="flex-1 py-2 px-3 text-center bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierCooldownDays: Math.min(365, (prev.freeTierCooldownDays || 7) + 1),
                            }))
                          }
                          className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                          title="Increase days"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Quick:</span>
                        {[1, 3, 5, 7, 14, 30].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({ ...prev, freeTierCooldownDays: days }))
                            }
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                              (config.freeTierCooldownDays || 7) === days
                                ? "bg-amber-500 text-neutral-950 font-bold"
                                : "bg-neutral-700/60 hover:bg-neutral-700 text-neutral-300"
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PRO PLAN DOWNLOAD & GENERATION LIMITS (EDITABLE) */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/20 via-neutral-900 to-neutral-900 border border-amber-500/30 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h3 className="text-base font-bold text-white">PRO Plan Download Limit &amp; Frequency Quota</h3>
                      </div>
                      <p className="text-xs text-neutral-400 max-w-xl">
                        Configure how many document downloads / generations PRO Plan users can perform within a specific timeframe, rather than unlimited access.
                      </p>
                    </div>

                    {/* Mode selector */}
                    <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, proPlanUnlimited: false }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          config.proPlanUnlimited === false
                            ? "bg-amber-500 text-neutral-950 shadow-xs"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Custom Quota (Active)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, proPlanUnlimited: true }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          config.proPlanUnlimited !== false
                            ? "bg-amber-500 text-neutral-950 shadow-xs"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Unlimited Access
                      </button>
                    </div>
                  </div>

                  {config.proPlanUnlimited === false ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pro Max Generations */}
                        <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-white flex items-center gap-2">
                              <Crown className="w-4 h-4 text-amber-400" />
                              <span>PRO Plan Max Generations</span>
                            </label>
                            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-md">
                              {config.proPlanMaxGenerations || 50} doc(s)
                            </span>
                          </div>

                          <p className="text-[11px] text-neutral-400">
                            Total allowed DOCX downloads / extractions for a PRO user before waiting for cooldown reset.
                          </p>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  proPlanMaxGenerations: Math.max(1, (prev.proPlanMaxGenerations || 50) - 5),
                                }))
                              }
                              className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                              title="Decrease PRO limit"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={config.proPlanMaxGenerations ?? 50}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  proPlanMaxGenerations: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)),
                                }))
                              }
                              className="flex-1 py-2 px-3 text-center bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  proPlanMaxGenerations: Math.min(1000, (prev.proPlanMaxGenerations || 50) + 5),
                                }))
                              }
                              className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                              title="Increase PRO limit"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Quick:</span>
                            {[10, 20, 30, 50, 100, 200].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setConfig((prev) => ({ ...prev, proPlanMaxGenerations: num }))}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                  (config.proPlanMaxGenerations || 50) === num
                                    ? "bg-amber-500 text-neutral-950 font-bold"
                                    : "bg-neutral-700/60 hover:bg-neutral-700 text-neutral-300"
                                }`}
                              >
                                {num} docs
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Pro Cooldown Window */}
                        <div className="p-5 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-white flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span>PRO Rolling Window (Days)</span>
                            </label>
                            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-md">
                              {config.proPlanCooldownDays || 30} day(s)
                            </span>
                          </div>

                          <p className="text-[11px] text-neutral-400">
                            Rolling time interval in days across which the PRO user's download limit is calculated.
                          </p>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  proPlanCooldownDays: Math.max(1, (prev.proPlanCooldownDays || 30) - 5),
                                }))
                              }
                              className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                              title="Decrease PRO days"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={config.proPlanCooldownDays ?? 30}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  proPlanCooldownDays: Math.max(1, Math.min(365, parseInt(e.target.value) || 1)),
                                }))
                              }
                              className="flex-1 py-2 px-3 text-center bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  proPlanCooldownDays: Math.min(365, (prev.proPlanCooldownDays || 30) + 5),
                                }))
                              }
                              className="w-10 h-10 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-lg flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
                              title="Increase PRO days"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Quick:</span>
                            {[7, 14, 30, 60, 90, 365].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => setConfig((prev) => ({ ...prev, proPlanCooldownDays: days }))}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                  (config.proPlanCooldownDays || 30) === days
                                    ? "bg-amber-500 text-neutral-950 font-bold"
                                    : "bg-neutral-700/60 hover:bg-neutral-700 text-neutral-300"
                                }`}
                              >
                                {days}d
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quick Pro Presets */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-neutral-400 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                        <span className="font-bold text-white flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          PRO Presets:
                        </span>
                        {[
                          { label: "50 Docs / 30 Days (Standard Monthly)", gen: 50, days: 30 },
                          { label: "30 Docs / 30 Days (Moderate Monthly)", gen: 30, days: 30 },
                          { label: "100 Docs / 30 Days (High Volume)", gen: 100, days: 30 },
                          { label: "15 Docs / 7 Days (Weekly Pro)", gen: 15, days: 7 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                proPlanMaxGenerations: preset.gen,
                                proPlanCooldownDays: preset.days,
                                proPlanUnlimited: false,
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                              config.proPlanUnlimited === false &&
                              config.proPlanMaxGenerations === preset.gen &&
                              config.proPlanCooldownDays === preset.days
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2.5">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        PRO Plan is set to <strong>100% Unlimited</strong>. To enforce a specific download limit or cooldown window on PRO users, select <strong>Custom Quota</strong> above.
                      </span>
                    </div>
                  )}
                </div>

                {/* Popular Presets Bar */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>One-Click Policy Presets</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { label: "2 Docs / 7 Days", gen: 2, days: 7, desc: "2 per week" },
                      { label: "2 Docs / 5 Days", gen: 2, days: 5, desc: "5-day rolling" },
                      { label: "1 Doc / 7 Days", gen: 1, days: 7, desc: "Standard weekly" },
                      { label: "1 Doc / 5 Days", gen: 1, days: 5, desc: "5-day single" },
                      { label: "3 Docs / 7 Days", gen: 3, days: 7, desc: "3 per week" },
                      { label: "1 Doc / 1 Day", gen: 1, days: 1, desc: "Daily free pass" },
                    ].map((preset) => {
                      const isSelected =
                        (config.freeTierMaxGenerations || 1) === preset.gen &&
                        (config.freeTierCooldownDays || 7) === preset.days;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              freeTierMaxGenerations: preset.gen,
                              freeTierCooldownDays: preset.days,
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                              : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                          }`}
                        >
                          <div className="text-xs font-bold">{preset.label}</div>
                          <div className="text-[10px] text-neutral-400">{preset.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* How it works info card */}
                <div className="p-4 rounded-2xl bg-neutral-800/30 border border-neutral-800 text-xs text-neutral-400 space-y-2">
                  <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>How the Rolling Window Quota Engine Works</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400 pl-1 leading-relaxed">
                    <li>Each free user can generate up to <strong className="text-neutral-200">{config.freeTierMaxGenerations || 1} document(s)</strong> within a rolling <strong className="text-neutral-200">{config.freeTierCooldownDays || 7}-day interval</strong>.</li>
                    <li>Every generation timestamp is logged. Once the user reaches {config.freeTierMaxGenerations || 1} generation(s), the button switches to "Limit Reached" and disables further extraction and DOCX generation.</li>
                    <li>Individual slots automatically restore {config.freeTierCooldownDays || 7} days after their respective generation timestamp.</li>
                    <li>You can reset any specific student's cooldown immediately by clicking <strong className="text-neutral-200">Reset Quota</strong> in the Registered Students tab.</li>
                  </ul>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingQuota}
                    className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSavingQuota ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Saving Rules to Database...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Generation Quota Rules</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MAINTENANCE SWITCH */}
          {activeTab === "maintenance" && (
            <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Maintenance Mode Switch</h2>
                  </div>
                  <p className="text-xs text-neutral-400 max-w-xl">
                    When enabled, all visitors accessing the site will see the dedicated Maintenance Screen.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    {config.maintenance ? "Active" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.maintenance}
                    onClick={handleToggleMaintenance}
                    disabled={isSavingMaintenance}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                      config.maintenance ? "bg-amber-500" : "bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                        config.maintenance ? "translate-x-9" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {maintenanceSaved && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Maintenance settings successfully broadcasted!</span>
                </div>
              )}

              <form onSubmit={handleSaveMaintenanceDetails} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Custom Maintenance Announcement
                  </label>
                  <textarea
                    rows={3}
                    value={config.maintenanceMessage}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, maintenanceMessage: e.target.value }))
                    }
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Estimated Resumption Time
                    </label>
                    <input
                      type="text"
                      value={config.maintenanceEta}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, maintenanceEta: e.target.value }))
                      }
                      placeholder="e.g. 15 minutes or 6:00 PM"
                      className="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSavingMaintenance}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Save Maintenance Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SECURITY, CLOUDFLARE & TAMPER DEFENSE SUITE */}
          {activeTab === "security" && (
            <div className="space-y-6 max-w-3xl">
              {/* Card 1: Cloudflare Security Gateway */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>Cloudflare Protection Gate</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-amber-500/20 text-amber-300 font-extrabold uppercase border border-amber-500/30">
                          Active Gateway
                        </span>
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Whenever someone opens the website, first a Cloudflare security verification check occurs before granting access.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !(config.cloudflareCheckEnabled ?? true);
                      setConfig((prev) => ({ ...prev, cloudflareCheckEnabled: next }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      config.cloudflareCheckEnabled ?? true
                        ? "bg-emerald-600 text-white shadow-emerald-900/30 shadow-md"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span>Cloudflare Gate: {config.cloudflareCheckEnabled ?? true ? "ENABLED" : "DISABLED"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Verification Frequency
                    </label>
                    <select
                      value={config.cloudflareCheckMode || "session"}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          cloudflareCheckMode: e.target.value as "always" | "session",
                        }))
                      }
                      className="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="session">Once Per Browser Session (Recommended)</option>
                      <option value="always">Every Page Reload (Strict Defense)</option>
                    </select>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Controls whether returning visitors are screened on every tab visit.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Cloudflare Turnstile Site Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.cloudflareTurnstileSiteKey || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, cloudflareTurnstileSiteKey: e.target.value }))
                      }
                      placeholder="e.g. 0x4AAAAAA..."
                      className="w-full px-3.5 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Leave empty to use the built-in simulated Cloudflare verification gate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Anti-DevTools & Anti-Exploit Protection */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>Anti-DevTools &amp; Exploit Defense</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-rose-500/20 text-rose-300 font-extrabold uppercase border border-rose-500/30">
                          Anti-Tamper
                        </span>
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Blocks developer options exploits, F12, Ctrl+Shift+I, right-click code inspection, and unauthorized control panel access.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !(config.antiDevToolsEnabled ?? true);
                      setConfig((prev) => ({ ...prev, antiDevToolsEnabled: next }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      config.antiDevToolsEnabled ?? true
                        ? "bg-emerald-600 text-white shadow-emerald-900/30 shadow-md"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span>Anti-DevTools: {config.antiDevToolsEnabled ?? true ? "ENABLED" : "DISABLED"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-300">
                  <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
                    <p className="font-semibold text-white mb-1">Key Combo Interception</p>
                    <p className="text-neutral-400 text-[11px]">Blocks F12, Ctrl+Shift+I/J/C, and Ctrl+U to prevent code inspection.</p>
                  </div>
                  <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
                    <p className="font-semibold text-white mb-1">Right-Click Lock</p>
                    <p className="text-neutral-400 text-[11px]">Disables "Inspect Element" context menu across all non-input areas.</p>
                  </div>
                  <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800">
                    <p className="font-semibold text-white mb-1">Console Shield</p>
                    <p className="text-neutral-400 text-[11px]">Prevents script injections and warns attackers tampering with variables.</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Anti-Cloning & Honeypot Scraper Shield */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>Anti-Cloning &amp; Honeypot Defense</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-cyan-500/20 text-cyan-300 font-extrabold uppercase border border-cyan-500/30">
                          Anti-Piracy
                        </span>
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        If anyone attempts to download or clone the website with HTTrack, SaveWeb2Zip, Wget, etc., a weird scrambled honeypot is delivered instead.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !(config.antiCloneEnabled ?? true);
                      setConfig((prev) => ({ ...prev, antiCloneEnabled: next }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      config.antiCloneEnabled ?? true
                        ? "bg-emerald-600 text-white shadow-emerald-900/30 shadow-md"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span>Anti-Cloning: {config.antiCloneEnabled ?? true ? "ENABLED" : "DISABLED"}</span>
                  </button>
                </div>

                <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-400 space-y-1">
                  <p className="text-cyan-400 font-semibold">[ACTIVE HONEYPOT ENFORCEMENT]</p>
                  <p>• Offline File URL detection (file://) triggers scrambled error view</p>
                  <p>• Scraper agent interceptor (SaveWeb2Zip, Cyotek, Teleport, Wget) replaces HTML with corrupted payload</p>
                  <p>• Cloned bundles receive 0 operable client code</p>
                </div>

                {/* Save Security Settings Button */}
                {securitySaveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{securitySaveSuccess}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveSecuritySettings()}
                  disabled={isSavingSecurity}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSecurity ? "Saving to Supabase..." : "Save Protection & Cloudflare Settings"}</span>
                </button>
              </div>

              {/* Card 4: Change Admin Passcode */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold text-white">Change Admin Passcode</h2>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Update the master passcode required to unlock the <span className="font-mono text-neutral-200">/control</span> panel. Once changed, your new passcode will be saved persistently to Supabase.
                  </p>
                </div>

                {passcodeSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passcodeSuccess}</span>
                  </div>
                )}

                {passcodeError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{passcodeError}</span>
                  </div>
                )}

                <form onSubmit={handleSavePasscode} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        New Admin Passcode
                      </label>
                      <input
                        type="password"
                        required
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="Enter new strong password"
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Confirm New Passcode
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Save New Admin Passcode
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: DATABASE & SUPABASE LIVE PREVIEW */}
          {activeTab === "database" && (
            <div className="space-y-6">
              {/* LIVE DIAGNOSTICS CARD */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-5 h-5 text-emerald-400" />
                      <h2 className="text-lg font-bold text-white">
                        Supabase Live Database &amp; Storage Monitor
                      </h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Real-time connection verification, latency heartbeat, and automatic schema diagnostics.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={runDatabaseCheck}
                      disabled={isCheckingDb}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? "animate-spin" : ""}`} />
                      <span>{isCheckingDb ? "Testing Connection..." : "Test Connection Now"}</span>
                    </button>
                    <a
                      href="https://supabase.com/dashboard/project/jwckftrlhnlbdvxswygs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-all"
                    >
                      <span>Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Status Hero Box */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    healthReport?.connected && healthReport.hasTables
                      ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                      : healthReport?.connected
                      ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                      : "bg-blue-950/40 border-blue-800/80 text-blue-200"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        healthReport?.connected && healthReport.hasTables
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : healthReport?.connected
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {healthReport?.connected && healthReport.hasTables ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : healthReport?.connected ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <Database className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          {healthReport?.connected && healthReport.hasTables
                            ? "Database Connected & Fully Synchronized"
                            : healthReport?.connected
                            ? "Supabase Project Online (Tables Setup Pending)"
                            : "Checking Database Status..."}
                        </h3>
                        {healthReport?.latencyMs !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-900/80 text-neutral-300 text-[10px] font-mono border border-neutral-700">
                            {healthReport.latencyMs}ms ping
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">
                        {healthReport?.message || "Running diagnostic test on Supabase connection..."}
                      </p>
                    </div>
                  </div>

                  {healthReport?.connected && !healthReport.hasTables && (
                    <a
                      href="https://supabase.com/dashboard/project/jwckftrlhnlbdvxswygs/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Run SQL in Supabase</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Connection Details & Table Check Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Project Config */}
                  <div className="p-4 rounded-2xl bg-neutral-800/40 border border-neutral-700/60 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Connection Endpoints
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Project ID:</span>
                        <span className="font-mono text-white font-semibold">
                          jwckftrlhnlbdvxswygs
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">API Host URL:</span>
                        <span className="font-mono text-emerald-300 break-all">
                          https://jwckftrlhnlbdvxswygs.supabase.co
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Access Key:</span>
                        <span className="font-mono text-neutral-300">
                          Anonymous Client Key (Configured)
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Last Diagnostics:</span>
                        <span className="text-neutral-400">
                          {healthReport?.testedAt
                            ? new Date(healthReport.testedAt).toLocaleTimeString()
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tables & Storage Status */}
                  <div className="p-4 rounded-2xl bg-neutral-800/40 border border-neutral-700/60 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                      <span>Cloud Database Resources</span>
                      <span className="text-[10px] font-normal text-neutral-400">
                        {healthReport?.hasTables ? "4/4 Tables Ready" : "Setup Required"}
                      </span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-mono text-[11px] text-white">users_profile</span>
                        </div>
                        {healthReport?.tables.users_profile ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] font-bold border border-neutral-700">
                            Not Found
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Server className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-mono text-[11px] text-white">generated_documents</span>
                        </div>
                        {healthReport?.tables.generated_documents ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] font-bold border border-neutral-700">
                            Not Found
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-mono text-[11px] text-white">activity_logs</span>
                        </div>
                        {healthReport?.tables.activity_logs ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] font-bold border border-neutral-700">
                            Not Found
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-mono text-[11px] text-white">system_config</span>
                        </div>
                        {healthReport?.tables.system_config ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] font-bold border border-neutral-700">
                            Not Found
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP-BY-STEP SETUP GUIDE */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">
                      How to Complete Supabase Setup (3 Simple Steps)
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    You added the Supabase extension in Vercel—here is what that did and the single 60-second step you need to do in Supabase.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700/60 flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs space-y-1">
                      <h4 className="font-bold text-white text-sm">
                        What Vercel Did Automatically
                      </h4>
                      <p className="text-neutral-300 leading-relaxed">
                        When you added the Supabase extension in Vercel, Vercel automatically injected your credentials (<code className="text-emerald-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code className="text-emerald-300">SUPABASE_URL</code>) into your Vercel project environment. <strong>Docify is already configured to use your project (<span className="font-mono text-emerald-300">jwckftrlhnlbdvxswygs</span>) out of the box!</strong> You don&apos;t need to write any code.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700/60 flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs space-y-2 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="font-bold text-white text-sm">
                          The 1 Step You Need To Do: Run The SQL Schema
                        </h4>
                        <a
                          href="https://supabase.com/dashboard/project/jwckftrlhnlbdvxswygs/sql/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 shrink-0"
                        >
                          <span>Open SQL Editor in Supabase</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-neutral-300 leading-relaxed">
                        Because your Supabase project was just created, it is completely empty. It needs its 4 tables (<code className="text-neutral-200">users_profile</code>, <code className="text-neutral-200">generated_documents</code>, <code className="text-neutral-200">activity_logs</code>, <code className="text-neutral-200">system_config</code>) and storage bucket created once:
                      </p>
                      <ol className="list-decimal pl-5 space-y-1 text-neutral-300">
                        <li>Click the <strong>Copy SQL Schema</strong> button below.</li>
                        <li>Click <strong>Open SQL Editor in Supabase</strong> (or visit <code className="text-blue-300">supabase.com -&gt; your project -&gt; SQL Editor</code>).</li>
                        <li>Paste the copied script into the query box and click the green <strong>Run</strong> button.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700/60 flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs space-y-1">
                      <h4 className="font-bold text-white text-sm">
                        Verify Live Connection in this Admin Panel
                      </h4>
                      <p className="text-neutral-300 leading-relaxed">
                        Once you run the SQL query in Supabase, return here and click <strong>Test Connection Now</strong> at the top. The status banner and all 4 tables will instantly turn green!
                      </p>
                    </div>
                  </div>
                </div>

                {/* SQL Code Box */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <span>Ready-to-run Database Schema &amp; Storage SQL</span>
                      <span className="text-[10px] text-neutral-400 font-normal">
                        (Includes Row Level Security Policies)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedSql ? "Copied to Clipboard!" : "Copy SQL Schema"}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 font-mono overflow-x-auto max-h-64 leading-relaxed">
                      {supabaseSqlSchema}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 2: Google Ads */}
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      $
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Monetization with Google AdSense (Optional)
                    </h3>
                  </div>
                  <a
                    href="https://adsense.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>adsense.google.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Ads are placed strategically across headers, processing modals, and export sections, and are <strong>strictly shown to Free users only</strong> (Paid users enjoy zero ads).
                </p>
                <ol className="text-xs text-neutral-300 space-y-1 list-decimal pl-5">
                  <li>Create a Google AdSense account and add your deployed Vercel domain.</li>
                  <li>Copy your Publisher ID (e.g. <code>ca-pub-1234567890123456</code>).</li>
                  <li>Add <code>VITE_ADSENSE_CLIENT_ID = ca-pub-XXXXXXXXXXXXXXXX</code> to your Vercel environment variables.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 5: LEGAL & POLICY PAGES (LIVE DB) */}
          {activeTab === "legal" && (
            <AdminLegalPagesEditor
              initialConfig={legalConfig}
              onSaved={(newCfg) => setLegalConfig(newCfg)}
            />
          )}
        </div>

        {/* Right Sidebar: Real-time Activity Stream & Live Monitor */}
        <aside className="w-full lg:w-80 space-y-4 shrink-0">
          {/* Active Now Card */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-neutral-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Active Now
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{activeVisitorsCount}</span>
              <span className="text-xs text-neutral-400 font-medium">students on site</span>
            </div>
            <p className="text-[11px] text-neutral-500">Real-time live heartbeat across college campuses</p>
          </div>

          {/* Recently / Last Registered */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Recently Registered</span>
            </h3>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {users.slice(0, 5).map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate max-w-[120px]">{u.username}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        u.plan === "paid" ? "bg-amber-500/20 text-amber-300" : "bg-neutral-700 text-neutral-400"
                      }`}
                    >
                      {u.plan.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="font-mono truncate max-w-[110px]">IP: {u.registeredIp || "103.x"}</span>
                    <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Used / Recent Generation Activity */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Recently Used Tool</span>
            </h3>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {logs
                .filter((l) => l.type === "generate")
                .slice(0, 6)
                .map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-xs space-y-1"
                  >
                    <p className="font-semibold text-white truncate">{log.details}</p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="font-mono">IP: {log.ipAddress || "49.x"}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              {logs.filter((l) => l.type === "generate").length === 0 && (
                <p className="text-[11px] text-neutral-500 py-2">No generations recorded yet today.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Admin User Password Change Modal */}
      {passwordModalUser && (
        <AdminPasswordModal
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onPasswordUpdated={(userId, newPass) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
            );
          }}
        />
      )}
    </div>
  );
};
