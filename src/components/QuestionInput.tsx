import React, { useState, useRef } from "react";
import { FileUp, AlignLeft, FileText, X, AlertCircle } from "lucide-react";
import { fileToBase64, formatBytes } from "../utils/fileHelpers";

interface QuestionInputProps {
  questionText: string;
  onQuestionTextChange: (text: string) => void;
  questionFile: { name: string; size: number; base64: string; mimeType: string } | null;
  onQuestionFileChange: (file: { name: string; size: number; base64: string; mimeType: string } | null) => void;
  isProcessing: boolean;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  questionText,
  onQuestionTextChange,
  questionFile,
  onQuestionFileChange,
  isProcessing,
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      onQuestionFileChange({
        name: file.name,
        size: file.size,
        base64,
        mimeType: file.type || "application/pdf",
      });
    } catch (err) {
      console.error("Error reading file:", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="question-input-panel" className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-3.5 sm:p-5 flex flex-col h-full transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
            1
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
              Assignment Questions / Tasks
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">
              PDF, professor's sheet, photo, or typed text
            </p>
          </div>
        </div>

        {/* Tab switcher: 2-col grid on mobile, flex on desktop */}
        <div className="grid grid-cols-2 sm:flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl sm:rounded-lg border border-neutral-200/80 dark:border-neutral-700 text-xs shrink-0 w-full sm:w-auto">
          <button
            id="tab-question-file"
            type="button"
            onClick={() => setActiveTab("file")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-md font-semibold text-xs transition-all whitespace-nowrap min-h-[38px] sm:min-h-0 cursor-pointer ${
              activeTab === "file"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <FileUp className="w-3.5 h-3.5 shrink-0" />
            <span>File Upload</span>
          </button>
          <button
            id="tab-question-text"
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-md font-semibold text-xs transition-all whitespace-nowrap min-h-[38px] sm:min-h-0 cursor-pointer ${
              activeTab === "text"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Paste / Type</span>
          </button>
        </div>
      </div>

      {activeTab === "file" ? (
        <div className="flex-1 flex flex-col justify-center">
          {questionFile ? (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{questionFile.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatBytes(questionFile.size)} • {questionFile.mimeType.split("/")[1]?.toUpperCase() || "DOCUMENT"}
                  </p>
                </div>
              </div>
              <button
                id="remove-question-file-btn"
                type="button"
                onClick={() => onQuestionFileChange(null)}
                disabled={isProcessing}
                className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                <FileUp className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Click or drag &amp; drop professor's sheet
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Supports PDF, Images (PNG, JPG), or TXT documents
              </p>
            </div>
          )}
          <div className="mt-3 flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span>JinAI automatically isolates assignment tasks and ignores syllabus headers or guidelines.</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <textarea
            id="question-text-input"
            value={questionText}
            onChange={(e) => onQuestionTextChange(e.target.value)}
            disabled={isProcessing}
            placeholder={`Paste your questions here. They can be separated by new lines, bullet points, or numbered lists:\n\n1. Write an 8085 microprocessor assembly program to add two 8-bit numbers with carry.\n2. Write a program to find the largest number in a memory block.\n3. Implement a delay routine using register pairs.`}
            className="w-full flex-1 min-h-[180px] p-3 text-xs sm:text-sm font-mono bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all leading-relaxed"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Numbered lists (1., 2.), dashes (-), or newlines are parsed with precision</span>
            <span>{questionText.trim() ? `${questionText.split(/\n+/).filter(Boolean).length} lines` : "Empty"}</span>
          </div>
        </div>
      )}
    </div>
  );
};
