export interface Question {
  id: string;
  number: string;
  question: string;
  context?: string;
  textAnswer?: string;
}

export interface AnswerImage {
  id: string;
  name: string;
  source: "zip" | "file" | "imgbb";
  base64: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  matchedQuestionId?: string | null;
  confidence?: number;
  rationale?: string;
}

export interface DocifyConfig {
  topicName: string;
  questionsPerPage: number; // 0 = continuous (no forced page breaks), 1, 2, 3, 4
  printBlankForUnanswered: boolean; // if true, keep unanswered questions with blank answer space; if false, exclude them
  blankSpaceLines: number; // lines of ruled space for blank answers
  studentName?: string;
  rollNumber?: string;
  subjectCode?: string;
  includeStudentHeader?: boolean;
}

export interface ExtractionResult {
  topic: string;
  questions: Question[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  password?: string;
  role?: string;
  plan: "free" | "paid";
  isApproved?: boolean;
  status?: "pending" | "approved" | "rejected";
  approvedAt?: string | null;
  approvedBy?: string;
  registeredIp?: string;
  lastIp?: string;
  createdAt: string;
  lastLoginAt: string;
  lastGenerationAt?: string | null;
  recentGenerations?: string[];
  docsGeneratedCount: number;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  topicName: string;
  questionCount: number;
  imageCount: number;
  fileName: string;
  createdAt: string;
  fileSize?: number;
  downloadUrl?: string; // Supabase Storage public/signed URL or data URL
}

export interface ActivityLog {
  id: string;
  type: "register" | "login" | "generate" | "plan_change" | "admin_action" | "password_change";
  userId?: string;
  username?: string;
  email?: string;
  ipAddress?: string;
  details: string;
  timestamp: string;
}

export interface SystemConfig {
  maintenance: boolean;
  maintenanceMessage: string;
  maintenanceEta: string;
  adminPasscode: string;
  // User Account Approval System
  requireApproval?: boolean; // When true, new users must be approved by admin before using extract/match or download
  // Free Tier Limits
  freeTierCooldownDays: number; // e.g. 7, 5, 3 days
  freeTierMaxGenerations: number; // e.g. 1, 2, 3 generations per cooldown window
  // Pro / Paid Tier Limits (Editable in admin panel)
  proPlanUnlimited?: boolean; // false = custom limit, true = unlimited
  proPlanMaxGenerations?: number; // e.g. 50, 100 docs
  proPlanCooldownDays?: number; // e.g. 30, 7 days
  adsEnabled: boolean;
  googleAdSenseClientId?: string;
  razorpayKeyId?: string;
  // Security & Protection Suite
  antiDevToolsEnabled?: boolean;
  antiCloneEnabled?: boolean;
  cloudflareCheckEnabled?: boolean;
  cloudflareCheckMode?: "always" | "first_visit" | "turnstile";
  cloudflareTurnstileSiteKey?: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  maxGenerations: number;
  cooldownDays: number;
  usedInWindow: number;
  remainingInWindow: number;
  daysRemaining?: number;
  hoursRemaining?: number;
  unlockDate?: Date;
  reason?: string;
}
