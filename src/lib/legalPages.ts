import { supabase } from "./supabase";

export interface LegalPagesConfig {
  about: string;
  contactEmail: string;
  contactSupportHours: string;
  contactAddress: string;
  contactPhone?: string;
  contactNotes?: string;
  privacyPolicy: string;
  refundPolicy: string;
  returnPolicy: string;
  disclaimer: string;
  lastUpdated: string;
}

const LEGAL_CONFIG_KEY = "docify_legal_pages_v1";

export const DEFAULT_LEGAL_PAGES: LegalPagesConfig = {
  lastUpdated: "September 2026",
  about: `Welcome to Docify, developed by Jinesh Mehta.

Docify is an intelligent, high-speed document compilation workspace engineered specifically for engineering, computer science, and college students worldwide. 

Students often spend countless hours taking screenshots of code outputs, terminal commands, circuit simulations, and 8085/8086 microprocessors, only to manually crop and paste them into Microsoft Word tables for weekly lab submissions. 

Docify was built to solve this pain point:
• Multi-Modal AI (JinAI): Automatically identifies question numbers and assignment objectives from PDF or text problem statements.
• Intelligent Screenshot Matching: Understands terminal logs, code snippets, assembly outputs, and formulas to map screenshots to their corresponding question.
• Native Word Export (.docx): Packages all answers, student metadata, page breaks, and ruled blank spaces into perfectly structured, print-ready Word documents in seconds.

Our mission is to save students valuable time on tedious manual formatting so they can focus on actual learning, engineering, and problem solving.`,

  contactEmail: "support@docify.app",
  contactSupportHours: "Monday to Saturday, 9:00 AM – 8:00 PM IST",
  contactAddress: "Docify by Jinesh Mehta, Mumbai, Maharashtra, India",
  contactPhone: "+91 98200 00000",
  contactNotes: "For general inquiries, account assistance, Pro plan upgrades, or feedback, please reach out to us. We typically respond within 12 to 24 hours.",

  privacyPolicy: `Effective Date: September 2026

At Docify by Jinesh Mehta ("Docify", "we", "our", or "us"), we prioritize the privacy and security of students, educators, and users who use our platform.

1. Information We Collect
• Account Information: When you create a Docify account, we collect your chosen username, email address, and encrypted credentials.
• Uploaded Documents & Screenshots: Assignment problem statements (PDF, images, or text) and uploaded screenshot solutions are processed strictly to perform AI extraction and match questions to images.
• Technical & Log Data: To prevent multi-accounting and protect system limits on our free tier, we log client IP addresses, browser types, and generation timestamps.

2. How We Use Your Information
• To provide, maintain, and improve our AI matching algorithms and Word document generation.
• To enforce fair-use limits (e.g., 1 free document export every 7 days for free tier users).
• To authenticate student logins and provide document download history in your dashboard.
• We NEVER sell, rent, or monetize your personal files, email addresses, or assignment screenshots with third-party advertisers or brokers.

3. Data Storage & Security
• All cloud data is safely hosted on enterprise-grade cloud databases (Supabase) with Row Level Security (RLS) policies.
• Processed documents and temporary screenshot files are stored securely and accessible only by you.

4. Third-Party Services
• Google AdSense: Free tier users may be shown non-intrusive banner advertisements to keep the platform free. These networks may use anonymized cookies in compliance with standard privacy laws.
• AI Models: Multimodal recognition is handled via secure server-side API requests.

5. Your Rights & Data Deletion
You may request the deletion of your account and associated documents at any time by contacting our support team.`,

  returnPolicy: `Return Policy for Digital Products & Services

Because Docify provides instant digital goods (automated document compilation, AI processing, and generated Microsoft Word .docx files), digital files cannot be physically "returned" once downloaded.

1. Digital Goods Non-Returnable Nature:
Once an assignment document is generated and downloaded to your device, it is considered delivered and consumed.

2. Defective or Corrupt Generation:
If an exported Word document is unreadable, corrupted, or fails to open in Microsoft Word, please notify our support team within 48 hours of generation. We will gladly re-generate or manually fix your document or reset your account generation quota immediately at no charge.`,

  refundPolicy: `Cancellation & Refund Policy

Thank you for choosing Docify by Jinesh Mehta. We strive to provide transparent and fair policies for all our users.

1. Free Tier
Docify provides a free tier allowing students to generate documents with a standard 7-day cooldown. No payment information is ever collected for the free plan.

2. Pro / Paid Subscriptions & One-Time Upgrades:
• 48-Hour Satisfaction Guarantee: If you purchase a Docify Paid/Pro plan and encounter technical difficulties that our team cannot resolve, you are eligible for a full refund within 48 hours of purchase.
• Accidental Duplicate Charges: If you are inadvertently charged twice for a subscription or upgrade, we will issue an immediate 100% refund for the duplicate transaction upon verification.
• Cancellation: You may cancel your Pro subscription at any time. Your Pro benefits (unlimited generations and ad-free workspace) will remain active through the end of your billing cycle.

3. How to Request a Refund:
To submit a refund inquiry, email our support team with your registered username, payment receipt, and reason for the request. All approved refunds are credited back to the original payment method within 5–7 business days.`,

  disclaimer: `Academic Integrity & Usage Disclaimer

1. Academic & Educational Use:
Docify by Jinesh Mehta is designed exclusively as an organizational formatting utility. It helps students format and bind their own independently solved lab work, verified code outputs, and project screenshots into clean document files.

2. Academic Honesty:
Docify is NOT a cheating tool or homework solver. Users are solely responsible for ensuring that their use of Docify complies with their university, college, school, or academic institution's code of conduct and plagiarism policies. Docify does not endorse academic dishonesty or unauthorized submission of another individual's intellectual property.

3. Trademark Acknowledgement:
Microsoft Word, DOCX, and Microsoft Office are registered trademarks of Microsoft Corporation. Google AdSense is a trademark of Google LLC. Supabase is a trademark of Supabase Inc. Docify is an independent utility and is not affiliated with or endorsed by Microsoft Corporation or Google LLC.

4. "As-Is" Service Provision:
While Docify utilizes advanced AI vision models to match answers, users must review all questions, text, and paired screenshots on the Review Board before final submission. Docify assumes no liability for academic grades, formatting discrepancies, or technical issues during student submissions.`,
};

// Retrieve live legal pages from Supabase (system_config table) with localStorage fallback
export async function getLegalPages(): Promise<LegalPagesConfig> {
  // 1. Try Supabase system_config
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "legal_pages")
        .maybeSingle();

      if (!error && data?.value) {
        const remote = data.value as LegalPagesConfig;
        localStorage.setItem(LEGAL_CONFIG_KEY, JSON.stringify(remote));
        return { ...DEFAULT_LEGAL_PAGES, ...remote };
      }
    } catch (err) {
      console.warn("Could not fetch legal pages from Supabase:", err);
    }
  }

  // 2. Try localStorage
  try {
    const cached = localStorage.getItem(LEGAL_CONFIG_KEY);
    if (cached) {
      return { ...DEFAULT_LEGAL_PAGES, ...JSON.parse(cached) };
    }
  } catch {
    //
  }

  // 3. Return defaults
  return DEFAULT_LEGAL_PAGES;
}

// Save legal pages globally to Supabase system_config and local cache
export async function saveLegalPages(config: LegalPagesConfig): Promise<boolean> {
  const updatedConfig = {
    ...config,
    lastUpdated: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };

  // Update local cache
  try {
    localStorage.setItem(LEGAL_CONFIG_KEY, JSON.stringify(updatedConfig));
  } catch {
    //
  }

  // Update Supabase system_config table
  if (supabase) {
    try {
      const { error } = await supabase.from("system_config").upsert({
        key: "legal_pages",
        value: updatedConfig,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Supabase upsert legal_pages error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Failed to save legal pages to Supabase:", err);
      return false;
    }
  }

  return true;
}
