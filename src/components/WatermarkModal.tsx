import React from "react";
import { X, ShieldCheck, FileText, CheckCircle2, Search, FileCode } from "lucide-react";

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="watermark-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                How to Verify Your Invisible Watermark
              </h2>
              <p className="text-xs text-neutral-400">
                Watermark: <span className="text-emerald-400 font-mono">"made by docify by jineshmehta"</span>
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

        <div className="p-6 overflow-y-auto space-y-4 text-neutral-800 dark:text-neutral-200 text-sm">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Every exported Word (.docx) file is permanently embedded with your watermark in multiple layers. It is invisible to teachers during regular viewing/printing, but you can prove authorship anytime using any of the 3 methods below:
          </p>

          {/* Method 1 */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              Method 1: Reveal in Microsoft Word Footer (Easiest)
            </div>
            <ol className="list-decimal list-inside text-xs text-neutral-700 dark:text-neutral-300 space-y-1 pl-1">
              <li>Open the downloaded <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">.docx</code> file in Microsoft Word or LibreOffice.</li>
              <li>Double-click on the bottom margin (footer area) of any page.</li>
              <li>Press <kbd className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded font-mono text-[11px]">Ctrl + A</kbd> (Select All) inside the footer.</li>
              <li>Change the font color to black or increase size to 14pt.</li>
              <li>The text <strong className="text-emerald-600 dark:text-emerald-400">"made by docify by jineshmehta"</strong> appears clearly right in the center!</li>
            </ol>
          </div>

          {/* Method 2 */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-sm">
              <Search className="w-4 h-4 text-indigo-600" />
              Method 2: Check Document Properties (Metadata)
            </div>
            <ol className="list-decimal list-inside text-xs text-neutral-700 dark:text-neutral-300 space-y-1 pl-1">
              <li>In Microsoft Word, click <strong>File &gt; Info</strong>.</li>
              <li>Look at the right column under <strong>Properties</strong>:</li>
              <li>
                <strong>Author / Creator:</strong> <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">Docify by JineshMehta</code>
              </li>
              <li>
                <strong>Company &amp; Subject:</strong> <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">made by docify by jineshmehta</code>
              </li>
            </ol>
          </div>

          {/* Method 3 */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-sm">
              <FileCode className="w-4 h-4 text-amber-600" />
              Method 3: Raw XML Inspection (Forensic Proof)
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              A <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">.docx</code> file is actually a zip container:
            </p>
            <ol className="list-decimal list-inside text-xs text-neutral-700 dark:text-neutral-300 space-y-1 pl-1">
              <li>Rename the downloaded file from <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">document.docx</code> to <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">document.zip</code>.</li>
              <li>Extract it, open <code className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded">docProps/core.xml</code> in any text editor.</li>
              <li>You will see <code className="text-blue-600 dark:text-blue-400 font-mono">&lt;dc:creator&gt;Docify by JineshMehta&lt;/dc:creator&gt;</code> and <code className="text-blue-600 dark:text-blue-400 font-mono">&lt;dc:subject&gt;made by docify by jineshmehta&lt;/dc:subject&gt;</code> permanently written into the file spec!</li>
            </ol>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-950 px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <span>100% Guaranteed Watermarked</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
