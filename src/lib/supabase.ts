import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UserProfile, GeneratedDocument, ActivityLog, SystemConfig, QuotaCheckResult } from "../types";

// Environment variables & default project configuration for Supabase
export const DEFAULT_SUPABASE_URL = "https://jwckftrlhnlbdvxswygs.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2tmdHJsaG5sYmR2eHN3eWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzU4NTEsImV4cCI6MjEwNDQ1MTg1MX0.8Vqv3boebdB7_spv3Qo8iJPTo09bkS0_fsfLtx5dpmg";

const metaEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

export const supabaseUrl: string =
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  metaEnv.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const supabaseAnonKey: string =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("placeholder")
);

export let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err);
    supabase = null;
  }
}

// ---------------------------------------------------------------------------
// Supabase Live Health & Table Diagnostics
// ---------------------------------------------------------------------------
export interface SupabaseHealthReport {
  connected: boolean;
  projectUrl: string;
  projectId: string;
  latencyMs?: number;
  tables: {
    users_profile: boolean;
    generated_documents: boolean;
    activity_logs: boolean;
    system_config: boolean;
  };
  storage: {
    docify_docs: boolean;
  };
  hasTables: boolean;
  message: string;
  testedAt: string;
}

export async function testSupabaseConnection(): Promise<SupabaseHealthReport> {
  const projectId = supabaseUrl.replace("https://", "").split(".")[0] || "jwckftrlhnlbdvxswygs";
  const report: SupabaseHealthReport = {
    connected: false,
    projectUrl: supabaseUrl,
    projectId,
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
    message: "Initiating connection test...",
    testedAt: new Date().toISOString(),
  };

  if (!supabase) {
    report.message = "Supabase client is not initialized.";
    return report;
  }

  const startTime = performance.now();

  try {
    // 1. Ping the project using an RPC or simple query
    const { error: cfgErr } = await supabase
      .from("system_config")
      .select("key")
      .limit(1);

    report.latencyMs = Math.round(performance.now() - startTime);

    if (cfgErr) {
      if (
        cfgErr.code === "42P01" ||
        cfgErr.message?.toLowerCase().includes("does not exist") ||
        cfgErr.message?.toLowerCase().includes("relation")
      ) {
        // Successfully connected to Supabase server, but tables haven't been created yet!
        report.connected = true;
        report.hasTables = false;
        report.message =
          "Connected to Supabase project! However, database tables have not been created yet. Copy and run the SQL script below in the Supabase SQL Editor.";
      } else {
        report.connected = false;
        report.message = `Connection error: ${cfgErr.message}`;
      }
    } else {
      report.connected = true;
      report.tables.system_config = true;
    }

    // 2. Check users_profile table
    try {
      const { error: uErr } = await supabase.from("users_profile").select("id").limit(1);
      report.tables.users_profile = !uErr;
    } catch {
      report.tables.users_profile = false;
    }

    // 3. Check generated_documents table
    try {
      const { error: dErr } = await supabase.from("generated_documents").select("id").limit(1);
      report.tables.generated_documents = !dErr;
    } catch {
      report.tables.generated_documents = false;
    }

    // 4. Check activity_logs table
    try {
      const { error: aErr } = await supabase.from("activity_logs").select("id").limit(1);
      report.tables.activity_logs = !aErr;
    } catch {
      report.tables.activity_logs = false;
    }

    // 5. Check storage bucket
    try {
      const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
      if (!bErr && buckets) {
        report.storage.docify_docs = buckets.some(
          (b) => b.name === "docify-docs" || b.id === "docify-docs"
        );
      }
    } catch {
      report.storage.docify_docs = false;
    }

    report.hasTables =
      report.tables.users_profile &&
      report.tables.generated_documents &&
      report.tables.activity_logs &&
      report.tables.system_config;

    if (report.connected && report.hasTables) {
      report.message = `Successfully connected to Supabase (${report.latencyMs}ms)! All 4 database tables and storage are active.`;
    } else if (report.connected && !report.hasTables) {
      report.message =
        "Supabase project is online and reachable, but one or more tables are missing. Please run the SQL schema script in Supabase SQL Editor.";
    }

    return report;
  } catch (err: any) {
    report.latencyMs = Math.round(performance.now() - startTime);
    report.connected = false;
    report.message = `Connection attempt failed: ${err?.message || "Network error"}`;
    return report;
  }
}

// ---------------------------------------------------------------------------
// IP Detection Utility
// ---------------------------------------------------------------------------
let cachedIp: string | null = null;
export async function getClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch {
    // Fallback if blocked or offline
  }
  // Generate consistent pseudo-IP for local preview
  let localIp = localStorage.getItem("docify_client_ip");
  if (!localIp) {
    localIp = `192.168.1.${Math.floor(Math.random() * 200 + 10)}`;
    localStorage.setItem("docify_client_ip", localIp);
  }
  cachedIp = localIp;
  return localIp;
}

// ---------------------------------------------------------------------------
// LocalStorage Fallback Storage Helpers
// ---------------------------------------------------------------------------
const USERS_KEY = "docify_users_db";
const DOCS_KEY = "docify_documents_db";
const LOGS_KEY = "docify_activity_db";
const SYSTEM_CONFIG_KEY = "docify_system_config_db";
const CURRENT_USER_KEY = "docify_current_user";

// Seed default admin and sample data if empty
function initLocalDb() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(USERS_KEY)) {
    const sampleUsers: UserProfile[] = [
      {
        id: "usr_sample_1",
        username: "rahul_sharma",
        email: "rahul.student@gmail.com",
        plan: "free",
        registeredIp: "103.21.124.89",
        lastIp: "103.21.124.89",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        lastGenerationAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        docsGeneratedCount: 1,
      },
      {
        id: "usr_sample_2",
        username: "priya_patel",
        email: "priya.p@outlook.com",
        plan: "paid",
        registeredIp: "49.36.110.12",
        lastIp: "49.36.110.12",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        lastGenerationAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        docsGeneratedCount: 7,
      },
      {
        id: "usr_sample_3",
        username: "alex_chen",
        email: "alexchen2026@gmail.com",
        plan: "free",
        registeredIp: "152.57.19.45",
        lastIp: "152.57.19.45",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        lastGenerationAt: null,
        docsGeneratedCount: 0,
      }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(sampleUsers));
  }

  if (!localStorage.getItem(DOCS_KEY)) {
    const sampleDocs: GeneratedDocument[] = [
      {
        id: "doc_sample_1",
        userId: "usr_sample_1",
        topicName: "Data Structures & Algorithms Assignment 3",
        questionCount: 4,
        imageCount: 4,
        fileName: "DSA_Assignment_3_Docify.docx",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        fileSize: 450200,
      },
      {
        id: "doc_sample_2",
        userId: "usr_sample_2",
        topicName: "Computer Networks Lab Manual",
        questionCount: 6,
        imageCount: 8,
        fileName: "CN_Lab_Manual_Docify.docx",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        fileSize: 820100,
      }
    ];
    localStorage.setItem(DOCS_KEY, JSON.stringify(sampleDocs));
  }

  if (!localStorage.getItem(LOGS_KEY)) {
    const sampleLogs: ActivityLog[] = [
      {
        id: "log_1",
        type: "register",
        username: "alex_chen",
        email: "alexchen2026@gmail.com",
        ipAddress: "152.57.19.45",
        details: "New student account created (Free Tier)",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
      },
      {
        id: "log_2",
        type: "generate",
        username: "priya_patel",
        email: "priya.p@outlook.com",
        ipAddress: "49.36.110.12",
        details: "Generated Word document: 'CN Lab Manual' (Paid Unlimited)",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      },
      {
        id: "log_3",
        type: "login",
        username: "rahul_sharma",
        email: "rahul.student@gmail.com",
        ipAddress: "103.21.124.89",
        details: "Student logged into workspace",
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      }
    ];
    localStorage.setItem(LOGS_KEY, JSON.stringify(sampleLogs));
  }

  if (!localStorage.getItem(SYSTEM_CONFIG_KEY)) {
    const defaultConfig: SystemConfig = {
      maintenance: false,
      maintenanceMessage: "Docify by JineshMehta is currently undergoing scheduled updates. Please check back shortly!",
      maintenanceEta: "15 minutes",
      adminPasscode: "Jinesh=16",
      requireApproval: true,
      freeTierCooldownDays: 7,
      freeTierMaxGenerations: 1,
      proPlanUnlimited: false,
      proPlanMaxGenerations: 50,
      proPlanCooldownDays: 30,
      adsEnabled: true,
      googleAdSenseClientId: "",
    };
    localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(defaultConfig));
  }
}

initLocalDb();

// ---------------------------------------------------------------------------
// System Config & Dynamic Admin Passcode
// ---------------------------------------------------------------------------
let cachedSystemConfig: SystemConfig | null = null;

export function getCachedSystemConfig(): SystemConfig {
  if (cachedSystemConfig) return cachedSystemConfig;
  const fallback: SystemConfig = {
    maintenance: false,
    maintenanceMessage: "Docify by JineshMehta is currently undergoing scheduled updates. Please check back shortly!",
    maintenanceEta: "15 minutes",
    adminPasscode: "Jinesh=16",
    requireApproval: true,
    freeTierCooldownDays: 7,
    freeTierMaxGenerations: 1,
    proPlanUnlimited: false,
    proPlanMaxGenerations: 50,
    proPlanCooldownDays: 30,
    adsEnabled: true,
  };
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SYSTEM_CONFIG_KEY) : null;
    if (raw) {
      cachedSystemConfig = { ...fallback, ...JSON.parse(raw) };
      return cachedSystemConfig!;
    }
  } catch {
    //
  }
  cachedSystemConfig = fallback;
  return cachedSystemConfig;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const fallback = getCachedSystemConfig();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "main_config")
        .maybeSingle();
      if (!error && data?.value) {
        const merged: SystemConfig = {
          ...fallback,
          ...data.value,
          requireApproval: data.value.requireApproval !== undefined ? Boolean(data.value.requireApproval) : fallback.requireApproval,
          freeTierCooldownDays: Math.max(1, Number(data.value.freeTierCooldownDays) || fallback.freeTierCooldownDays || 7),
          freeTierMaxGenerations: Math.max(1, Number(data.value.freeTierMaxGenerations) || fallback.freeTierMaxGenerations || 1),
          proPlanUnlimited: data.value.proPlanUnlimited !== undefined ? Boolean(data.value.proPlanUnlimited) : fallback.proPlanUnlimited,
          proPlanMaxGenerations: Math.max(1, Number(data.value.proPlanMaxGenerations) || fallback.proPlanMaxGenerations || 50),
          proPlanCooldownDays: Math.max(1, Number(data.value.proPlanCooldownDays) || fallback.proPlanCooldownDays || 30),
        };
        cachedSystemConfig = merged;
        localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn("Supabase fetch system_config error:", err);
    }
  }

  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: SystemConfig = {
        ...fallback,
        ...parsed,
        requireApproval: parsed.requireApproval !== undefined ? Boolean(parsed.requireApproval) : fallback.requireApproval,
        freeTierCooldownDays: Math.max(1, Number(parsed.freeTierCooldownDays) || fallback.freeTierCooldownDays || 7),
        freeTierMaxGenerations: Math.max(1, Number(parsed.freeTierMaxGenerations) || fallback.freeTierMaxGenerations || 1),
        proPlanUnlimited: parsed.proPlanUnlimited !== undefined ? Boolean(parsed.proPlanUnlimited) : fallback.proPlanUnlimited,
        proPlanMaxGenerations: Math.max(1, Number(parsed.proPlanMaxGenerations) || fallback.proPlanMaxGenerations || 50),
        proPlanCooldownDays: Math.max(1, Number(parsed.proPlanCooldownDays) || fallback.proPlanCooldownDays || 30),
      };
      cachedSystemConfig = merged;
      return merged;
    }
  } catch {
    //
  }
  return fallback;
}

export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
  const current = await getSystemConfig();
  const nextConfig: SystemConfig = {
    ...current,
    ...updates,
    requireApproval: updates.requireApproval !== undefined ? Boolean(updates.requireApproval) : current.requireApproval,
    freeTierCooldownDays: updates.freeTierCooldownDays !== undefined ? Math.max(1, Number(updates.freeTierCooldownDays) || 7) : current.freeTierCooldownDays,
    freeTierMaxGenerations: updates.freeTierMaxGenerations !== undefined ? Math.max(1, Number(updates.freeTierMaxGenerations) || 1) : current.freeTierMaxGenerations,
    proPlanUnlimited: updates.proPlanUnlimited !== undefined ? Boolean(updates.proPlanUnlimited) : current.proPlanUnlimited,
    proPlanMaxGenerations: updates.proPlanMaxGenerations !== undefined ? Math.max(1, Number(updates.proPlanMaxGenerations) || 50) : current.proPlanMaxGenerations,
    proPlanCooldownDays: updates.proPlanCooldownDays !== undefined ? Math.max(1, Number(updates.proPlanCooldownDays) || 30) : current.proPlanCooldownDays,
  };
  cachedSystemConfig = nextConfig;

  localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(nextConfig));

  if (supabase) {
    try {
      await supabase.from("system_config").upsert({
        key: "main_config",
        value: nextConfig,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Supabase upsert system_config error:", err);
    }
  }

  // Also broadcast to server memory if available
  try {
    await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passcode: nextConfig.adminPasscode,
        maintenance: nextConfig.maintenance,
        message: nextConfig.maintenanceMessage,
        estimatedTime: nextConfig.maintenanceEta,
      }),
    });
  } catch {
    //
  }

  return nextConfig;
}

// ---------------------------------------------------------------------------
// User Authentication & Management
// ---------------------------------------------------------------------------

// Clean helper to strictly parse approval status from DB record or local state
export function parseUserApproval(
  rawApproved: any,
  rawStatus: any,
  role?: string,
  username?: string,
  email?: string
): { isApproved: boolean; status: "approved" | "pending" | "rejected" } {
  // Super admin / admin accounts are always fully approved
  const isAdmin =
    role === "admin" ||
    (username && username.toLowerCase() === "jinesh") ||
    (email && email.toLowerCase() === "jineshgamer120@gmail.com");

  if (isAdmin) {
    return { isApproved: true, status: "approved" };
  }

  // Explicit rejection
  if (rawStatus === "rejected") {
    return { isApproved: false, status: "rejected" };
  }

  // Strict approval: rawApproved MUST be explicitly true, or status MUST be "approved" while rawApproved is not false/null
  const isApproved =
    rawApproved === true ||
    (rawApproved !== false && rawApproved !== null && rawApproved !== undefined && rawStatus === "approved");

  if (isApproved) {
    return { isApproved: true, status: "approved" };
  }

  // All other non-admin accounts are strictly pending
  return { isApproved: false, status: "pending" };
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const u: UserProfile = JSON.parse(raw);
    const approval = parseUserApproval(u.isApproved, u.status, u.role, u.username, u.email);
    return {
      ...u,
      isApproved: approval.isApproved,
      status: approval.status,
    };
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null): void {
  if (user) {
    const approval = parseUserApproval(user.isApproved, user.status, user.role, user.username, user.email);
    const normalizedUser: UserProfile = {
      ...user,
      isApproved: approval.isApproved,
      status: approval.status,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export async function getAllUsers(): Promise<UserProfile[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users_profile")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((u: any) => {
          const approval = parseUserApproval(u.is_approved, u.status, u.role, u.username, u.email);
          return {
            id: u.id,
            username: u.username,
            email: u.email,
            password: u.password_hash,
            plan: u.plan || "free",
            isApproved: approval.isApproved,
            status: approval.status,
            approvedAt: u.approved_at || null,
            approvedBy: u.approved_by || undefined,
            registeredIp: u.registered_ip,
            lastIp: u.last_ip,
            createdAt: u.created_at,
            lastLoginAt: u.last_login_at,
            lastGenerationAt: u.last_generation_at,
            docsGeneratedCount: u.docs_generated_count || 0,
          };
        });
      }
    } catch (err) {
      console.warn("Supabase getAllUsers error:", err);
    }
  }

  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed: UserProfile[] = JSON.parse(raw);
    return parsed.map((u) => {
      const approval = parseUserApproval(u.isApproved, u.status, u.role, u.username, u.email);
      return {
        ...u,
        isApproved: approval.isApproved,
        status: approval.status,
      };
    });
  } catch {
    return [];
  }
}

// Fetch the latest profile data from Supabase for the active user
export async function refreshCurrentUser(): Promise<UserProfile | null> {
  const current = getCurrentUser();
  if (!current) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users_profile")
        .select("*")
        .eq("id", current.id)
        .maybeSingle();

      if (!error && data) {
        const approval = parseUserApproval(data.is_approved, data.status, data.role, data.username, data.email);
        const refreshed: UserProfile = {
          id: data.id,
          username: data.username,
          email: data.email,
          password: data.password_hash,
          plan: data.plan || "free",
          isApproved: approval.isApproved,
          status: approval.status,
          approvedAt: data.approved_at || null,
          approvedBy: data.approved_by || undefined,
          registeredIp: data.registered_ip,
          lastIp: data.last_ip,
          createdAt: data.created_at,
          lastLoginAt: data.last_login_at,
          lastGenerationAt: data.last_generation_at,
          docsGeneratedCount: data.docs_generated_count || 0,
        };
        setCurrentUser(refreshed);
        return refreshed;
      }
    } catch (err) {
      console.warn("Supabase refreshCurrentUser error:", err);
    }
  }

  // Fallback to local
  const existing = await getAllUsers();
  const found = existing.find((u) => u.id === current.id);
  if (found) {
    setCurrentUser(found);
    return found;
  }

  return current;
}

// Check if an IP address has abused or created too many accounts
export async function checkIpRestrictions(ip: string): Promise<{ restricted: boolean; reason?: string }> {
  const users = await getAllUsers();
  // Check if multiple accounts registered from this IP in the last 7 days
  const sameIpUsers = users.filter((u) => u.registeredIp === ip || u.lastIp === ip);
  
  if (sameIpUsers.length >= 3) {
    return {
      restricted: true,
      reason: "Maximum account limit reached for this network/IP address to prevent abuse.",
    };
  }
  return { restricted: false };
}

// Register new user
export async function registerUser(params: {
  username: string;
  email: string;
  password: string;
}): Promise<{ user: UserProfile | null; error?: string }> {
  const usernameClean = params.username.trim().toLowerCase();
  const emailClean = params.email.trim().toLowerCase();
  const ip = await getClientIp();

  if (params.password.length < 5) {
    return { user: null, error: "Password must be at least 5 characters long." };
  }

  // Check IP limits
  const ipCheck = await checkIpRestrictions(ip);
  if (ipCheck.restricted) {
    return { user: null, error: ipCheck.reason };
  }

  const existingUsers = await getAllUsers();
  if (existingUsers.some((u) => u.email.toLowerCase() === emailClean)) {
    return { user: null, error: "An account with this email address already exists. Please sign in." };
  }
  if (existingUsers.some((u) => u.username.toLowerCase() === usernameClean)) {
    return { user: null, error: "This username is already taken. Please choose another." };
  }

  // Check system config for approval requirement
  const config = await getSystemConfig();
  const requireApproval = config.requireApproval ?? true;
  const isApproved = !requireApproval;
  const status: "pending" | "approved" = isApproved ? "approved" : "pending";

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: params.username.trim(),
    email: emailClean,
    plan: "free", // Always free by default
    isApproved,
    status,
    approvedAt: isApproved ? new Date().toISOString() : null,
    approvedBy: isApproved ? "auto" : undefined,
    registeredIp: ip,
    lastIp: ip,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    lastGenerationAt: null,
    docsGeneratedCount: 0,
  };

  // Try Supabase insert
  if (supabase) {
    try {
      await supabase.from("users_profile").insert({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        password_hash: params.password,
        plan: "free",
        is_approved: isApproved,
        status: status,
        approved_at: newUser.approvedAt,
        approved_by: newUser.approvedBy,
        registered_ip: ip,
        last_ip: ip,
        created_at: newUser.createdAt,
        last_login_at: newUser.lastLoginAt,
        docs_generated_count: 0,
      });
    } catch (err) {
      console.warn("Supabase user register fallback to local:", err);
    }
  }

  // Local storage save
  const updatedUsers = [newUser, ...existingUsers];
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  setCurrentUser(newUser);

  // Log activity
  logActivity({
    type: "register",
    userId: newUser.id,
    username: newUser.username,
    email: newUser.email,
    ipAddress: ip,
    details: `New student registration (Free plan, ${isApproved ? "Approved automatically" : "Pending Admin Approval"})`,
  });

  return { user: newUser };
}

// Sign in user
export async function loginUser(params: {
  identifier: string; // email or username
  password: string;
}): Promise<{ user: UserProfile | null; error?: string }> {
  const idClean = params.identifier.trim().toLowerCase();
  const ip = await getClientIp();

  let user: UserProfile | null = null;

  // Supabase Auth or Table lookup
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users_profile")
        .select("*")
        .or(`email.eq.${idClean},username.eq.${idClean}`)
        .maybeSingle();

      if (!error && data) {
        if (data.password_hash === params.password) {
          const approval = parseUserApproval(data.is_approved, data.status, data.role, data.username, data.email);
          user = {
            id: data.id,
            username: data.username,
            email: data.email,
            plan: data.plan || "free",
            isApproved: approval.isApproved,
            status: approval.status,
            approvedAt: data.approved_at || null,
            approvedBy: data.approved_by || undefined,
            registeredIp: data.registered_ip,
            lastIp: ip,
            createdAt: data.created_at,
            lastLoginAt: new Date().toISOString(),
            lastGenerationAt: data.last_generation_at,
            docsGeneratedCount: data.docs_generated_count || 0,
          };
          // update last_login
          await supabase
            .from("users_profile")
            .update({ last_login_at: new Date().toISOString(), last_ip: ip })
            .eq("id", data.id);
        }
      }
    } catch (err) {
      console.warn("Supabase login lookup error:", err);
    }
  }

  // Fallback to local
  if (!user) {
    const existingUsers = await getAllUsers();
    const found = existingUsers.find(
      (u) => u.email.toLowerCase() === idClean || u.username.toLowerCase() === idClean
    );
    if (found) {
      const approval = parseUserApproval(found.isApproved, found.status, found.role, found.username, found.email);
      user = {
        ...found,
        isApproved: approval.isApproved,
        status: approval.status,
        lastLoginAt: new Date().toISOString(),
        lastIp: ip,
      };
      // update in local
      const updatedList = existingUsers.map((u) => (u.id === found.id ? user! : u));
      localStorage.setItem(USERS_KEY, JSON.stringify(updatedList));
    }
  }

  if (!user) {
    return { user: null, error: "Invalid username/email or password." };
  }

  setCurrentUser(user);
  logActivity({
    type: "login",
    userId: user.id,
    username: user.username,
    email: user.email,
    ipAddress: ip,
    details: `User signed in successfully`,
  });

  return { user };
}

// Update user approval status (Admin operation)
export async function updateUserApproval(
  userId: string,
  approved: boolean,
  adminName: string = "jinesh"
): Promise<boolean> {
  const status: "approved" | "rejected" = approved ? "approved" : "rejected";
  const approvedAt = approved ? new Date().toISOString() : null;

  if (supabase) {
    try {
      await supabase
        .from("users_profile")
        .update({
          is_approved: approved,
          status,
          approved_at: approvedAt,
          approved_by: adminName,
        })
        .eq("id", userId);
    } catch (err) {
      console.warn("Supabase updateUserApproval err:", err);
    }
  }

  const existingUsers = await getAllUsers();
  const updated = existingUsers.map((u) =>
    u.id === userId
      ? {
          ...u,
          isApproved: approved,
          status,
          approvedAt,
          approvedBy: adminName,
        }
      : u
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));

  const current = getCurrentUser();
  if (current && current.id === userId) {
    const updatedCurrent: UserProfile = {
      ...current,
      isApproved: approved,
      status,
      approvedAt,
      approvedBy: adminName,
    };
    setCurrentUser(updatedCurrent);
  }

  logActivity({
    type: "admin_action",
    userId,
    details: approved
      ? `Account approved by Admin (${adminName}) - Access granted`
      : `Account approval revoked by Admin (${adminName})`,
  });

  return true;
}

// Helper to check whether a user is approved to use core extraction/matching/download services
export function isUserApproved(
  user: UserProfile | null,
  configOverride?: Partial<SystemConfig>
): {
  approved: boolean;
  status: "approved" | "pending" | "rejected" | "not_logged_in";
  message: string;
} {
  const config = { ...getCachedSystemConfig(), ...configOverride };
  if (!user) {
    return {
      approved: false,
      status: "not_logged_in",
      message: "Please sign in or create an account to use the extract & match service.",
    };
  }

  // Admin users always have full approved privileges
  const isAdmin =
    user.role === "admin" ||
    user.username.toLowerCase() === "jinesh" ||
    user.email.toLowerCase() === "jineshgamer120@gmail.com";

  if (isAdmin) {
    return {
      approved: true,
      status: "approved",
      message: "Administrator access approved",
    };
  }

  // If approval gatekeeper is disabled by admin in settings, all users have access
  if (config.requireApproval === false) {
    return {
      approved: true,
      status: "approved",
      message: "Account approved (Gatekeeper disabled)",
    };
  }

  if (user.status === "rejected") {
    return {
      approved: false,
      status: "rejected",
      message: "Account approval was declined. Contact jinesh to resolve this.",
    };
  }

  // Strict approval check: non-admin users must be explicitly approved (isApproved === true AND status === "approved")
  if (user.isApproved === true && user.status === "approved") {
    return {
      approved: true,
      status: "approved",
      message: "Account approved",
    };
  }

  return {
    approved: false,
    status: "pending",
    message: "Waiting for Account Approval. contact jinesh to approve your account.",
  };
}

// Update user plan (Admin operation)
export async function updateUserPlan(userId: string, newPlan: "free" | "paid"): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from("users_profile").update({ plan: newPlan }).eq("id", userId);
    } catch (err) {
      console.warn("Supabase plan update err:", err);
    }
  }

  const existingUsers = await getAllUsers();
  const updated = existingUsers.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u));
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));

  // If current logged-in user is the one changed, update their session
  const current = getCurrentUser();
  if (current && current.id === userId) {
    current.plan = newPlan;
    setCurrentUser(current);
  }

  logActivity({
    type: "plan_change",
    userId,
    details: `Plan manually updated to '${newPlan.toUpperCase()}' by Admin`,
  });

  return true;
}

// Reset generation cooldown for a user (Admin operation)
export async function resetUserCooldown(userId: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from("users_profile").update({ last_generation_at: null }).eq("id", userId);
    } catch (err) {
      console.warn("Supabase cooldown reset err:", err);
    }
  }

  const existingUsers = await getAllUsers();
  const updated = existingUsers.map((u) => (u.id === userId ? { ...u, lastGenerationAt: null, recentGenerations: [] } : u));
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));

  const current = getCurrentUser();
  if (current && current.id === userId) {
    current.lastGenerationAt = null;
    current.recentGenerations = [];
    setCurrentUser(current);
  }

  logActivity({
    type: "admin_action",
    userId,
    details: `Generation quota & cooldown reset by Admin for user ID ${userId}`,
  });

  return true;
}

// Update user account password (Admin operation)
export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.trim().length === 0) {
    throw new Error("Password cannot be empty.");
  }
  const cleanPass = newPassword.trim();

  // 1. Update in Supabase users_profile table
  if (supabase) {
    try {
      const { error } = await supabase
        .from("users_profile")
        .update({ password_hash: cleanPass })
        .eq("id", userId);
      if (error) {
        console.warn("Supabase password update error:", error);
      }
    } catch (err) {
      console.warn("Supabase updateUserPassword error:", err);
    }
  }

  // 2. Update in local users storage
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map((u: any) =>
        u.id === userId ? { ...u, password: cleanPass, password_hash: cleanPass } : u
      );
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    }
  } catch {
    //
  }

  // 3. If currently logged in user is the modified user, update session password
  const current = getCurrentUser();
  if (current && current.id === userId) {
    current.password = cleanPass;
    setCurrentUser(current);
  }

  // 4. Log admin activity
  logActivity({
    type: "admin_action",
    userId,
    details: `Admin changed account password for user ID: ${userId}`,
  });

  return true;
}

// Check dynamic generation quota & cooldown for Free and PRO Users
export function checkGenerationQuota(
  user: UserProfile | null,
  configOverride?: Partial<SystemConfig>
): QuotaCheckResult {
  const config = { ...getCachedSystemConfig(), ...configOverride };
  const isPaid = user?.plan === "paid";

  // Paid users with unlimited setting enabled
  if (isPaid && config.proPlanUnlimited === true) {
    return {
      allowed: true,
      maxGenerations: 999999,
      cooldownDays: 0,
      usedInWindow: 0,
      remainingInWindow: 999999,
      reason: "Unlimited generations with Paid / PRO tier.",
    };
  }

  const maxGenerations = isPaid
    ? Math.max(1, Number(config.proPlanMaxGenerations) || 50)
    : Math.max(1, Number(config.freeTierMaxGenerations) || 1);

  const cooldownDays = isPaid
    ? Math.max(1, Number(config.proPlanCooldownDays) || 30)
    : Math.max(1, Number(config.freeTierCooldownDays) || 7);

  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

  // If not logged in or anonymous, allow standard preview
  if (!user) {
    return {
      allowed: true,
      maxGenerations,
      cooldownDays,
      usedInWindow: 0,
      remainingInWindow: maxGenerations,
    };
  }

  const now = Date.now();
  const windowStart = now - cooldownMs;

  // Collect all generation timestamps for this user
  let timestamps: number[] = [];
  if (Array.isArray(user.recentGenerations) && user.recentGenerations.length > 0) {
    timestamps = user.recentGenerations
      .map((t) => new Date(t).getTime())
      .filter((t) => !isNaN(t));
  } else if (user.lastGenerationAt) {
    const t = new Date(user.lastGenerationAt).getTime();
    if (!isNaN(t)) timestamps.push(t);
  }

  // Also check local documents cache to ensure accurate count
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(DOCS_KEY) : null;
    if (raw) {
      const docs: GeneratedDocument[] = JSON.parse(raw);
      const userDocs = docs.filter((d) => d.userId === user.id);
      for (const d of userDocs) {
        const docTime = new Date(d.createdAt).getTime();
        if (!isNaN(docTime) && !timestamps.includes(docTime)) {
          timestamps.push(docTime);
        }
      }
    }
  } catch {
    // Ignore storage parse error
  }

  // Legacy fallback if user has generated count > 0 but no timestamps
  if (timestamps.length === 0 && user.docsGeneratedCount && user.docsGeneratedCount > 0) {
    const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : now;
    timestamps.push(createdTime);
  }

  // Active generations within rolling window [now - cooldownMs, now]
  const activeTimestamps = timestamps
    .filter((t) => t > windowStart)
    .sort((a, b) => a - b); // ascending: oldest first

  const usedInWindow = activeTimestamps.length;
  const remainingInWindow = Math.max(0, maxGenerations - usedInWindow);
  const planLabel = isPaid ? "PRO Plan" : "Free Tier";

  if (usedInWindow < maxGenerations) {
    return {
      allowed: true,
      maxGenerations,
      cooldownDays,
      usedInWindow,
      remainingInWindow,
      reason:
        usedInWindow > 0
          ? `${remainingInWindow} of ${maxGenerations} ${planLabel} generation(s) remaining in your ${cooldownDays}-day window.`
          : `All ${maxGenerations} ${planLabel} generation(s) available for the next ${cooldownDays} days.`,
    };
  }

  // Quota reached: calculate when the earliest active slot will unlock
  const earliestToUnlock = activeTimestamps[activeTimestamps.length - maxGenerations] || activeTimestamps[0];
  const unlockTime = earliestToUnlock + cooldownMs;
  const diffMs = Math.max(0, unlockTime - now);
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesRemaining = Math.max(1, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

  let timeDesc = "";
  if (daysRemaining > 0) {
    timeDesc = `${daysRemaining} day(s) and ${hoursRemaining} hour(s)`;
  } else if (hoursRemaining > 0) {
    timeDesc = `${hoursRemaining} hour(s) and ${minutesRemaining} min`;
  } else {
    timeDesc = `${minutesRemaining} minute(s)`;
  }

  return {
    allowed: false,
    maxGenerations,
    cooldownDays,
    usedInWindow,
    remainingInWindow: 0,
    daysRemaining,
    hoursRemaining,
    unlockDate: new Date(unlockTime),
    reason: `${planLabel} limit reached (${maxGenerations} doc${maxGenerations > 1 ? "s" : ""} every ${cooldownDays} day${cooldownDays > 1 ? "s" : ""}). Your next generation slot unlocks in ${timeDesc}.`,
  };
}

// Record a completed document generation
export async function recordDocumentGeneration(params: {
  userId?: string;
  topicName: string;
  questionCount: number;
  imageCount: number;
  fileName: string;
  fileBlob?: Blob;
}): Promise<GeneratedDocument> {
  const ip = await getClientIp();
  const now = new Date().toISOString();

  const docRecord: GeneratedDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: params.userId || "anonymous",
    topicName: params.topicName || "Assignment Document",
    questionCount: params.questionCount,
    imageCount: params.imageCount,
    fileName: params.fileName,
    createdAt: now,
    fileSize: params.fileBlob ? params.fileBlob.size : undefined,
  };

  // Upload to Supabase Storage if configured and fileBlob provided
  if (supabase && params.fileBlob) {
    try {
      const storagePath = `documents/${docRecord.id}_${params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("docify-docs")
        .upload(storagePath, params.fileBlob, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from("docify-docs").getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          docRecord.downloadUrl = publicUrlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Supabase storage upload error:", storageErr);
    }
  }

  // Insert doc metadata into Supabase
  if (supabase) {
    try {
      await supabase.from("generated_documents").insert({
        id: docRecord.id,
        user_id: docRecord.userId,
        topic_name: docRecord.topicName,
        question_count: docRecord.questionCount,
        image_count: docRecord.imageCount,
        file_name: docRecord.fileName,
        file_size: docRecord.fileSize,
        download_url: docRecord.downloadUrl,
        created_at: docRecord.createdAt,
      });
    } catch (err) {
      console.warn("Supabase insert doc record err:", err);
    }
  }

  // Save to LocalStorage
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const docs = raw ? JSON.parse(raw) : [];
    localStorage.setItem(DOCS_KEY, JSON.stringify([docRecord, ...docs]));
  } catch {
    //
  }

  // Update user quota and generation timestamp
  if (params.userId && params.userId !== "anonymous") {
    const existingUsers = await getAllUsers();
    const updated = existingUsers.map((u) => {
      if (u.id === params.userId) {
        const prevRecent = Array.isArray(u.recentGenerations)
          ? u.recentGenerations
          : u.lastGenerationAt
          ? [u.lastGenerationAt]
          : [];
        const nextRecent = [now, ...prevRecent].slice(0, 50);
        return {
          ...u,
          lastGenerationAt: now,
          recentGenerations: nextRecent,
          docsGeneratedCount: (u.docsGeneratedCount || 0) + 1,
          lastIp: ip,
        };
      }
      return u;
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));

    const current = getCurrentUser();
    if (current && current.id === params.userId) {
      const prevRecent = Array.isArray(current.recentGenerations)
        ? current.recentGenerations
        : current.lastGenerationAt
        ? [current.lastGenerationAt]
        : [];
      current.lastGenerationAt = now;
      current.recentGenerations = [now, ...prevRecent].slice(0, 50);
      current.docsGeneratedCount = (current.docsGeneratedCount || 0) + 1;
      setCurrentUser(current);
    }

    if (supabase) {
      try {
        await supabase
          .from("users_profile")
          .update({
            last_generation_at: now,
            docs_generated_count: (current?.docsGeneratedCount || 1),
            last_ip: ip,
          })
          .eq("id", params.userId);
      } catch (err) {
        console.warn("Supabase update quota error:", err);
      }
    }
  }

  logActivity({
    type: "generate",
    userId: params.userId,
    ipAddress: ip,
    details: `Generated assignment doc: "${params.topicName}" (${params.questionCount} questions, ${params.imageCount} screenshots)`,
  });

  return docRecord;
}

// Get generated documents for a specific user
export async function getUserDocuments(userId: string): Promise<GeneratedDocument[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          topicName: d.topic_name,
          questionCount: d.question_count,
          imageCount: d.image_count,
          fileName: d.file_name,
          createdAt: d.created_at,
          fileSize: d.file_size,
          downloadUrl: d.download_url,
        }));
      }
    } catch (err) {
      console.warn("Supabase getUserDocuments err:", err);
    }
  }

  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const docs: GeneratedDocument[] = raw ? JSON.parse(raw) : [];
    return docs.filter((d) => d.userId === userId);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Activity Logging & Analytics
// ---------------------------------------------------------------------------
export async function logActivity(activity: Omit<ActivityLog, "id" | "timestamp">): Promise<void> {
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    ...activity,
    timestamp: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("activity_logs").insert({
        id: newLog.id,
        type: newLog.type,
        user_id: newLog.userId,
        username: newLog.username,
        email: newLog.email,
        ip_address: newLog.ipAddress,
        details: newLog.details,
        timestamp: newLog.timestamp,
      });
    } catch {
      //
    }
  }

  try {
    const raw = localStorage.getItem(LOGS_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOGS_KEY, JSON.stringify([newLog, ...logs.slice(0, 50)]));
  } catch {
    //
  }
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(40);
      if (!error && data) {
        return data.map((l: any) => ({
          id: l.id,
          type: l.type,
          userId: l.user_id,
          username: l.username,
          email: l.email,
          ipAddress: l.ip_address,
          details: l.details,
          timestamp: l.timestamp,
        }));
      }
    } catch (err) {
      console.warn("Supabase getActivityLogs err:", err);
    }
  }

  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
