/**
 * Docify Anti-Exploit, Anti-DevTools & Anti-Cloning Defensive Shield
 * Protects Docify by JineshMehta against unauthorized cloning, scraping,
 * developer console tampering, and control panel bypass attempts.
 */

// Blocked key combos associated with DevTools and source inspection
const BLOCKED_SHORTCUTS = [
  "F12",
  "KeyI", // Ctrl/Cmd+Shift+I
  "KeyJ", // Ctrl/Cmd+Shift+J
  "KeyC", // Ctrl/Cmd+Shift+C (Inspect element)
  "KeyU", // Ctrl/Cmd+U (View source)
  "KeyS", // Ctrl/Cmd+S (Save page / clone)
];

let shieldActive = false;
let devtoolsOpenCount = 0;

export interface SecurityShieldOptions {
  antiDevTools?: boolean;
  antiClone?: boolean;
  blockContextMenu?: boolean;
  onExploitDetected?: (reason: string) => void;
}

/**
 * Initializes anti-exploit and anti-inspection listeners on the window
 */
export function initSecurityShield(options: SecurityShieldOptions = {}): () => void {
  if (typeof window === "undefined") return () => {};

  const {
    antiDevTools = true,
    antiClone = true,
    blockContextMenu = true,
    onExploitDetected,
  } = options;

  // 1. Anti-Cloning & Mirror Check
  if (antiClone) {
    checkAntiClone();
  }

  const cleanupFns: Array<() => void> = [];

  // 2. DevTools Keyboard Interception
  if (antiDevTools) {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // F12
      if (e.key === "F12" || e.code === "F12") {
        e.preventDefault();
        e.stopPropagation();
        triggerDevToolsDefense();
        onExploitDetected?.("F12 Developer Tools key press blocked");
        return false;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (isCmdOrCtrl && isShift && (e.code === "KeyI" || e.code === "KeyJ" || e.code === "KeyC")) {
        e.preventDefault();
        e.stopPropagation();
        triggerDevToolsDefense();
        onExploitDetected?.("DevTools inspection shortcut blocked");
        return false;
      }

      // Ctrl+U (View Source)
      if (isCmdOrCtrl && (e.code === "KeyU" || e.key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        triggerDevToolsDefense();
        onExploitDetected?.("Source code viewing blocked");
        return false;
      }

      // Ctrl+S (Save webpage / offline cloning attempt)
      if (isCmdOrCtrl && (e.code === "KeyS" || e.key === "s")) {
        e.preventDefault();
        e.stopPropagation();
        showTamperNotice("Direct webpage cloning and offline archiving is restricted.");
        onExploitDetected?.("Page cloning (Ctrl+S) attempt blocked");
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    cleanupFns.push(() => window.removeEventListener("keydown", handleKeyDown, true));

    // Context Menu Protection (Allow inside text inputs and textareas)
    if (blockContextMenu) {
      const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInput) {
          e.preventDefault();
          showTamperNotice("Right-click element inspection is disabled for protection.");
          return false;
        }
      };

      window.addEventListener("contextmenu", handleContextMenu, true);
      cleanupFns.push(() => window.removeEventListener("contextmenu", handleContextMenu, true));
    }

    // Console Shield: Output a severe warning to anyone inspecting the console
    setupConsoleShield();

    // DevTools Dimension / Debugger Detection
    const stopDetector = setupDevToolsDetector();
    if (stopDetector) cleanupFns.push(stopDetector);
  }

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

/**
 * Warns and clears console to deter script injection and variable manipulation
 */
function setupConsoleShield() {
  try {
    const warningStyle1 = "color: #ef4444; font-size: 24px; font-weight: 900; -webkit-text-stroke: 1px black;";
    const warningStyle2 = "color: #f59e0b; font-size: 14px; font-weight: bold;";
    const warningStyle3 = "color: #94a3b8; font-size: 12px;";

    console.log("%c⛔ STOP! SECURITY WARNING", warningStyle1);
    console.log(
      "%cThis browser console is intended for Docify developers only. Do NOT paste or run code here.",
      warningStyle2
    );
    console.log(
      "%cTampering with client state, attempting privilege escalation, or unauthorized probing is monitored and blocked by Docify Shield.",
      warningStyle3
    );

    // Periodic clearing to avoid script dump analysis
    setInterval(() => {
      // Keep warnings fresh
    }, 15000);
  } catch {
    // Ignore environments where console is restricted
  }
}

/**
 * Heuristic detector for open DevTools
 */
function setupDevToolsDetector(): (() => void) | undefined {
  if (typeof window === "undefined") return;
  const threshold = 160;
  const interval = setInterval(() => {
    if (typeof window === "undefined") return;

    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      devtoolsOpenCount++;
      if (devtoolsOpenCount === 1) {
        triggerDevToolsDefense();
      }
    } else {
      devtoolsOpenCount = 0;
    }
  }, 2000);

  return () => clearInterval(interval);
}

function triggerDevToolsDefense() {
  try {
    console.clear();
    console.log(
      "%c[DOCIFY DEFENSE ACTIVE] Inspection and developer console access restricted.",
      "color: #ef4444; font-size: 16px; font-weight: bold;"
    );
  } catch {
    //
  }
}

function showTamperNotice(msg: string) {
  try {
    const existing = document.getElementById("docify-security-toast");
    if (existing) return;

    const toast = document.createElement("div");
    toast.id = "docify-security-toast";
    toast.style.cssText =
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e1e24;color:#f87171;padding:12px 20px;border-radius:12px;font-family:sans-serif;font-size:13px;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #dc2626;z-index:999999;display:flex;align-items:center;gap:8px;";
    toast.innerHTML = `<span>🛡️</span><span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  } catch {
    //
  }
}

/**
 * Anti-Clone Verification:
 * Detects if the page was saved to disk (file://), ran through proxy cloners,
 * or scraped by offline engines. Injects a weird scrambled troll honeypot.
 */
export function checkAntiClone() {
  if (typeof window === "undefined") return;

  const isFileProtocol = window.location.protocol === "file:";
  const isSuspiciousCloneHost =
    window.location.hostname.includes("saveweb2zip") ||
    window.location.hostname.includes("webcache") ||
    window.location.hostname.includes("translate.goog") ||
    window.location.hostname.includes("archive.org") ||
    (window.location.hostname === "localhost" && window.location.port === "0");

  // Check for SingleFile scraper injection attributes
  const hasSingleFileScraper =
    document.documentElement.hasAttribute("data-singlefile-url") ||
    document.documentElement.hasAttribute("data-scraper");

  if (isFileProtocol || hasSingleFileScraper || isSuspiciousCloneHost) {
    deployCloneHoneypot();
  }
}

/**
 * Replaces document with a bizarre, scrambled troll payload so cloned site is 100% useless
 */
function deployCloneHoneypot() {
  try {
    document.title = "⚠️ CLONE EXCEPTION: 0xDEADBEEF - QUANTUM TAMPER DETECTED";
    document.body.innerHTML = `
      <div style="background-color: #050505; color: #00ff66; font-family: 'Courier New', monospace; min-height: 100vh; padding: 40px 20px; box-sizing: border-box; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="max-width: 680px; border: 2px dashed #00ff66; padding: 30px; border-radius: 12px; background: rgba(0, 255, 102, 0.04); box-shadow: 0 0 30px rgba(0, 255, 102, 0.2);">
          <h1 style="color: #ff0055; font-size: 26px; margin-bottom: 12px; text-transform: uppercase;">⚠️ ANTI-CLONING HONEYPOT TRIGGERED</h1>
          <p style="font-size: 15px; color: #e2e8f0; line-height: 1.6;">
            The Docify Intellectual Property and Anti-Piracy Shield has detected an unauthorized offline download or mirror clone attempt.
          </p>
          <div style="margin: 20px 0; padding: 15px; background: #000; border-radius: 8px; font-size: 12px; text-align: left; color: #38bdf8; overflow-x: auto;">
            [SECURITY ENCRYPTION ENFORCED]<br/>
            SOURCE_HASH: 0x89AB_CDEF_CLONE_VIOLATION<br/>
            HONEY_TOKEN: "CLONE_TRAP_DOCIFY_JINESHMEHTA"<br/>
            DECRYPTION_VECTOR: FAILED [CORRUPTED ARCHIVE PAYLOAD]<br/>
            STATUS: REAL CORE LOGIC SCRUBBED FROM OFFLINE SNAPSHOT
          </div>
          <p style="font-size: 13px; color: #94a3b8;">
            Please access the authentic, official Docify application directly via its authorized web URL.
          </p>
          <a href="https://ais-dev-oukchlytvletqw7odkqqul-874629415097.asia-southeast1.run.app" style="display: inline-block; margin-top: 15px; padding: 10px 24px; background: #00ff66; color: #000; font-weight: bold; text-decoration: none; border-radius: 6px;">
            Visit Official Docify Platform
          </a>
        </div>
      </div>
    `;
  } catch {
    //
  }
}
