import React, { useState, useRef } from "react";
import {
  Edit2,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowRightLeft,
  AlertTriangle,
  FileQuestion,
  Eye,
  FileCheck,
  RotateCcw,
  Upload,
  Link as LinkIcon,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { Question, AnswerImage } from "../types";

interface ReviewBoardProps {
  topicName: string;
  onTopicNameChange: (topic: string) => void;
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  images: AnswerImage[];
  onImagesChange: (images: AnswerImage[]) => void;
  onPreviewImage: (image: AnswerImage) => void;
  onReMatchAI: () => void;
  isProcessing: boolean;
}

export const ReviewBoard: React.FC<ReviewBoardProps> = ({
  topicName,
  onTopicNameChange,
  questions,
  onQuestionsChange,
  images,
  onImagesChange,
  onPreviewImage,
  onReMatchAI,
  isProcessing,
}) => {
  const [editingTopic, setEditingTopic] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestionText, setEditedQuestionText] = useState("");

  // Add Question Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newQNum, setNewQNum] = useState("");
  const [newQText, setNewQText] = useState("");
  const [newQAnswer, setNewQAnswer] = useState("");

  // Inline ImgBB input state per question (questionId -> open state & url)
  const [activeImgbbQuestionId, setActiveImgbbQuestionId] = useState<string | null>(null);
  const [imgbbUrlInput, setImgbbUrlInput] = useState("");
  const [isExtractingImgbb, setIsExtractingImgbb] = useState(false);
  const [imgbbError, setImgbbError] = useState<string | null>(null);

  // Text answer edit state (questionId -> boolean)
  const [editingAnswerQuestionId, setEditingAnswerQuestionId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");

  // File upload input ref per question
  const fileUploadRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Group images by question
  const matchedImagesMap = new Map<string, AnswerImage[]>();
  const unassignedImages: AnswerImage[] = [];

  images.forEach((img) => {
    if (img.matchedQuestionId && questions.some((q) => q.id === img.matchedQuestionId)) {
      const list = matchedImagesMap.get(img.matchedQuestionId) || [];
      list.push(img);
      matchedImagesMap.set(img.matchedQuestionId, list);
    } else {
      unassignedImages.push(img);
    }
  });

  const matchedQuestionsCount = questions.filter(
    (q) => (matchedImagesMap.get(q.id) || []).length > 0 || (q.textAnswer && q.textAnswer.trim().length > 0)
  ).length;

  // Reassign image to another question or unassign
  const handleReassignImage = (imageId: string, targetQuestionId: string | null) => {
    const updated = images.map((img) => {
      if (img.id === imageId) {
        return {
          ...img,
          matchedQuestionId: targetQuestionId || null,
          rationale: targetQuestionId ? "Manually assigned by student" : "Unassigned",
          confidence: targetQuestionId ? 1.0 : undefined,
        };
      }
      return img;
    });
    onImagesChange(updated);
  };

  // Remove image completely
  const handleDeleteImage = (imageId: string) => {
    onImagesChange(images.filter((img) => img.id !== imageId));
  };

  // Edit question prompt text
  const startEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditedQuestionText(q.question);
  };

  const saveEditQuestion = (id: string) => {
    onQuestionsChange(
      questions.map((q) =>
        q.id === id ? { ...q, question: editedQuestionText.trim() || q.question } : q
      )
    );
    setEditingQuestionId(null);
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    // Unassign any images that were matched to this question
    const updatedImages = images.map((img) =>
      img.matchedQuestionId === id ? { ...img, matchedQuestionId: null } : img
    );
    onImagesChange(updatedImages);
    onQuestionsChange(questions.filter((q) => q.id !== id));
  };

  // Add new question via modal
  const handleOpenAddModal = () => {
    setNewQNum(String(questions.length + 1));
    setNewQText("");
    setNewQAnswer("");
    setIsAddModalOpen(true);
  };

  const handleSaveNewQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) return;

    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      number: newQNum.trim() || String(questions.length + 1),
      question: newQText.trim(),
      textAnswer: newQAnswer.trim() || undefined,
    };

    onQuestionsChange([...questions, newQuestion]);
    setIsAddModalOpen(false);
    setNewQText("");
    setNewQAnswer("");
  };

  // Written answer editor
  const startEditAnswer = (q: Question) => {
    setEditingAnswerQuestionId(q.id);
    setAnswerDraft(q.textAnswer || "");
  };

  const saveEditAnswer = (qId: string) => {
    onQuestionsChange(
      questions.map((q) =>
        q.id === qId ? { ...q, textAnswer: answerDraft.trim() || undefined } : q
      )
    );
    setEditingAnswerQuestionId(null);
  };

  // Direct file upload for a specific question
  const handleDirectFileUpload = async (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newImages: AnswerImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      newImages.push({
        id: `img_direct_${Date.now()}_${i}`,
        name: file.name,
        source: "file",
        base64,
        size: file.size,
        mimeType: file.type,
        matchedQuestionId: questionId,
        confidence: 1.0,
        rationale: "Directly attached to question",
      });
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }
  };

  // ImgBB fetch and attach directly to a specific question
  const handleFetchImgbbForQuestion = async (questionId: string) => {
    if (!imgbbUrlInput.trim()) return;
    setIsExtractingImgbb(true);
    setImgbbError(null);

    try {
      const res = await fetch("/api/extract-imgbb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [imgbbUrlInput.trim()] }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract image from ImgBB");
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        const extracted: AnswerImage[] = data.images.map((img: any) => ({
          ...img,
          matchedQuestionId: questionId,
          confidence: 1.0,
          rationale: "Attached via ImgBB link",
        }));

        onImagesChange([...images, ...extracted]);
        setImgbbUrlInput("");
        setActiveImgbbQuestionId(null);
      } else {
        setImgbbError("Could not extract image. Please check the URL (e.g. https://ibb.co/xyz).");
      }
    } catch (err: any) {
      setImgbbError(err.message || "Failed to extract from ImgBB");
    } finally {
      setIsExtractingImgbb(false);
    }
  };

  return (
    <div id="review-board" className="space-y-6">
      {/* Topic Name Banner */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Document Topic / Title
              </span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">• Appears as header in Word document</span>
            </div>
            {editingTopic ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => onTopicNameChange(e.target.value)}
                  className="text-lg font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-blue-400 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setEditingTopic(false)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 group">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Topic: <span className="text-blue-600 dark:text-blue-400">{topicName || "Assignment"}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingTopic(true)}
                  className="opacity-60 group-hover:opacity-100 p-1 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity cursor-pointer"
                  title="Edit topic title"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Stats & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <FileQuestion className="w-3.5 h-3.5 text-neutral-500" />
              <span>{questions.length} Questions</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{matchedQuestionsCount} Answered</span>
            </div>

            {questions.length - matchedQuestionsCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{questions.length - matchedQuestionsCount} Unanswered</span>
              </div>
            )}

            <button
              id="re-run-ai-matching-btn"
              type="button"
              onClick={onReMatchAI}
              disabled={isProcessing || images.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Re-evaluate and match answers with JinAI"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-run AI Match</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned images tray if any exist */}
      {unassignedImages.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Unassigned Screenshots ({unassignedImages.length})
              </h3>
              <span className="text-xs text-amber-700 dark:text-amber-400 hidden sm:inline">
                These screenshots were not matched automatically. You can assign or delete them:
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {unassignedImages.map((img) => (
              <div
                key={img.id}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-amber-200 dark:border-amber-800/70 overflow-hidden shadow-2xs"
              >
                <div
                  className="aspect-video w-full relative bg-neutral-100 dark:bg-neutral-800 group cursor-pointer"
                  onClick={() => onPreviewImage(img)}
                >
                  <img src={img.base64} alt={img.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate flex-1" title={img.name}>
                      {img.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="text-neutral-400 hover:text-red-600 p-0.5"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <select
                    className="w-full text-[11px] p-1 border border-neutral-200 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value=""
                    onChange={(e) => handleReassignImage(img.id, e.target.value)}
                  >
                    <option value="">Assign to...</option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        Q{q.number}: {q.question.slice(0, 26)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions list header with Add Question button */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Assignment Questions & Matched Answers
          </h3>
          <button
            id="add-question-btn"
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <FileQuestion className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No questions found.</p>
            <p className="text-xs text-neutral-400 mt-1">Upload an assignment sheet in Step 1 or click "Add Question" above.</p>
          </div>
        ) : (
          questions.map((q, index) => {
            const matchedImgs = matchedImagesMap.get(q.id) || [];
            const isEditing = editingQuestionId === q.id;
            const isEditingAnswer = editingAnswerQuestionId === q.id;
            const isImgbbOpen = activeImgbbQuestionId === q.id;
            const hasTextAnswer = Boolean(q.textAnswer && q.textAnswer.trim().length > 0);

            return (
              <div
                key={q.id}
                id={`question-card-${q.id}`}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                {/* Question Header & Content */}
                <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {q.number || index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editedQuestionText}
                              onChange={(e) => setEditedQuestionText(e.target.value)}
                              className="w-full text-sm font-medium text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-blue-400 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveEditQuestion(q.id)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 cursor-pointer"
                              >
                                Save Question
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(null)}
                                className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white leading-relaxed">
                              {q.question}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditQuestion(q)}
                          className="p-1.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Edit question text"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answer Section */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Action Bar for Adding Answers / Attaching Images */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        Answers &amp; Screenshots:
                      </span>
                      {matchedImgs.length === 0 && !hasTextAnswer ? (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                          Unanswered
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                          {matchedImgs.length > 0 ? `${matchedImgs.length} screenshot${matchedImgs.length > 1 ? "s" : ""}` : ""}
                          {matchedImgs.length > 0 && hasTextAnswer ? " + " : ""}
                          {hasTextAnswer ? "Written answer" : ""}
                        </span>
                      )}
                    </div>

                    {/* Quick Attach Controls for this Question */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* 1. Write/Edit Text Answer */}
                      <button
                        type="button"
                        onClick={() => startEditAnswer(q)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer"
                        title="Write or edit text answer for this question"
                      >
                        <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>{hasTextAnswer ? "Edit Text Answer" : "+ Text Answer"}</span>
                      </button>

                      {/* 2. Upload Image Direct */}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        ref={(el) => (fileUploadRefs.current[q.id] = el)}
                        onChange={(e) => handleDirectFileUpload(q.id, e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => fileUploadRefs.current[q.id]?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors cursor-pointer"
                        title="Upload screenshots from your computer directly for this question"
                      >
                        <Upload className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>+ Attach Image</span>
                      </button>

                      {/* 3. Add via ImgBB link */}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeImgbbQuestionId === q.id) {
                            setActiveImgbbQuestionId(null);
                          } else {
                            setActiveImgbbQuestionId(q.id);
                            setImgbbUrlInput("");
                            setImgbbError(null);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                          isImgbbOpen
                            ? "bg-blue-600 text-white border-blue-600"
                            : "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border-neutral-200 dark:border-neutral-700"
                        }`}
                        title="Paste an ImgBB link to attach screenshot directly"
                      >
                        <LinkIcon className="w-3 h-3 text-indigo-500" />
                        <span>+ ImgBB Link</span>
                      </button>

                      {/* 4. Link from unassigned screenshots if available */}
                      {unassignedImages.length > 0 && (
                        <select
                          className="text-xs py-1 px-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleReassignImage(e.target.value, q.id);
                          }}
                        >
                          <option value="">+ Link Unassigned ({unassignedImages.length})</option>
                          {unassignedImages.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name.slice(0, 24)}...
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Inline ImgBB input form if open */}
                  {isImgbbOpen && (
                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
                        <span>Paste ImgBB Link for Question {q.number}:</span>
                        <button
                          type="button"
                          onClick={() => setActiveImgbbQuestionId(null)}
                          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="e.g. https://ibb.co/6y4M4Hw or direct image URL"
                          value={imgbbUrlInput}
                          onChange={(e) => setImgbbUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleFetchImgbbForQuestion(q.id);
                            }
                          }}
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleFetchImgbbForQuestion(q.id)}
                          disabled={isExtractingImgbb || !imgbbUrlInput.trim()}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          {isExtractingImgbb ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Parsing...</span>
                            </>
                          ) : (
                            <span>Fetch &amp; Attach</span>
                          )}
                        </button>
                      </div>
                      {imgbbError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                          {imgbbError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Written Text Answer Display / Edit */}
                  {isEditingAnswer ? (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        <span>Written Answer / Code / Notes for Q{q.number}:</span>
                        <span className="text-[11px] text-neutral-400 font-normal">Included above screenshots in Word export</span>
                      </div>
                      <textarea
                        value={answerDraft}
                        onChange={(e) => setAnswerDraft(e.target.value)}
                        placeholder="Type answer explanation, code solution, or output notes here..."
                        className="w-full text-xs font-mono p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditAnswer(q.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 cursor-pointer"
                        >
                          Save Text Answer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAnswerQuestionId(null)}
                          className="px-3 py-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-md hover:bg-neutral-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        {q.textAnswer && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnswerDraft("");
                              saveEditAnswer(q.id);
                            }}
                            className="px-2 py-1 text-red-600 hover:text-red-700 text-xs font-medium cursor-pointer ml-auto"
                          >
                            Remove text answer
                          </button>
                        )}
                      </div>
                    </div>
                  ) : hasTextAnswer ? (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          Written Text Answer:
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditAnswer(q)}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-neutral-800 dark:text-neutral-200 font-mono whitespace-pre-wrap leading-relaxed">
                        {q.textAnswer}
                      </p>
                    </div>
                  ) : null}

                  {/* Screenshots gallery */}
                  {matchedImgs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matchedImgs.map((img) => (
                        <div
                          key={img.id}
                          className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all"
                        >
                          <div
                            className="aspect-video w-full bg-neutral-900 relative group cursor-pointer overflow-hidden"
                            onClick={() => onPreviewImage(img)}
                          >
                            <img
                              src={img.base64}
                              alt={img.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-5 h-5" />
                            </div>
                            {img.confidence !== undefined && (
                              <div className="absolute top-2 right-2 bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20">
                                {Math.round(img.confidence * 100)}% match
                              </div>
                            )}
                          </div>

                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate flex-1" title={img.name}>
                                {img.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(img.id)}
                                className="text-neutral-400 hover:text-red-600 p-0.5"
                                title="Delete image from workspace"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {img.rationale && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed" title={img.rationale}>
                                {img.rationale}
                              </p>
                            )}

                            {/* Reassign dropdown */}
                            <div className="pt-1 flex items-center gap-1.5 border-t border-neutral-200/60 dark:border-neutral-700">
                              <ArrowRightLeft className="w-3 h-3 text-neutral-400 shrink-0" />
                              <select
                                className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-1.5 py-1 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={q.id}
                                onChange={(e) =>
                                  handleReassignImage(
                                    img.id,
                                    e.target.value === "unassign" ? null : e.target.value
                                  )
                                }
                              >
                                <option value={q.id}>Keep in Q{q.number}</option>
                                <option value="unassign">Unassign from question</option>
                                <optgroup label="Move to another Question:">
                                  {questions
                                    .filter((other) => other.id !== q.id)
                                    .map((other) => (
                                      <option key={other.id} value={other.id}>
                                        Move to Q{other.number}: {other.question.slice(0, 24)}...
                                      </option>
                                    ))}
                                </optgroup>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !hasTextAnswer ? (
                    <div className="border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 rounded-xl p-4 text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        No answer screenshot or written answer linked yet.
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                        Use the buttons above to attach an image, paste an ImgBB link, or write an answer.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Question Modal */}
      {isAddModalOpen && (
        <div
          id="add-question-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-950/70 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-neutral-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" /> Add New Assignment Question
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewQuestion} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Question Number / Identifier
                </label>
                <input
                  type="text"
                  value={newQNum}
                  onChange={(e) => setNewQNum(e.target.value)}
                  placeholder="e.g. 5 or Q5 or Task 2.1"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Question / Task Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="e.g. Write an 8085 microprocessor assembly program to find the largest number in an array..."
                  required
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Written Answer / Code / Solution (Optional)
                </label>
                <textarea
                  value={newQAnswer}
                  onChange={(e) => setNewQAnswer(e.target.value)}
                  placeholder="Optional text answer, code snippet, or notes to include in the Word document..."
                  rows={2}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newQText.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-2xs"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
