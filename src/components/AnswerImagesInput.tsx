import React, { useState, useRef } from "react";
import {
  FolderArchive,
  ImageIcon,
  Link2,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Eye,
} from "lucide-react";
import JSZip from "jszip";
import { AnswerImage } from "../types";
import { fileToBase64, formatBytes } from "../utils/fileHelpers";

interface AnswerImagesInputProps {
  images: AnswerImage[];
  onImagesChange: (images: AnswerImage[]) => void;
  onPreviewImage: (image: AnswerImage) => void;
  isProcessing: boolean;
}

export const AnswerImagesInput: React.FC<AnswerImagesInputProps> = ({
  images,
  onImagesChange,
  onPreviewImage,
  isProcessing,
}) => {
  const [activeTab, setActiveTab] = useState<"files" | "zip" | "imgbb">("files");
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [isFetchingImgbb, setIsFetchingImgbb] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imgbbText, setImgbbText] = useState("");
  const [imgbbStatus, setImgbbStatus] = useState<string | null>(null);

  const zipInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Parse ImgBB viewer links from textarea
  const parseImgbbLinks = (text: string): string[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const valid: string[] = [];
    lines.forEach((line) => {
      // Matches ibb.co links or direct image links
      if (line.includes("ibb.co/") || line.includes("imgbb.com/") || /\.(png|jpg|jpeg|webp)$/i.test(line)) {
        // Support multiple links separated by comma or space on single line
        const parts = line.split(/[\s,]+/);
        parts.forEach((p) => {
          if (p.startsWith("http")) valid.push(p);
        });
      }
    });
    return Array.from(new Set(valid));
  };

  // 1. Handle ZIP upload
  const handleZipUpload = async (file: File) => {
    setIsExtractingZip(true);
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"];
      const extractedImages: AnswerImage[] = [];

      // Sort files naturally by filename (e.g. 1.png, 2.png, 10.png)
      const entries = Object.keys(zipContent.files).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      );

      for (const relativePath of entries) {
        const zipEntry = zipContent.files[relativePath];
        if (zipEntry.dir || relativePath.startsWith("__MACOSX/") || relativePath.includes("/.")) {
          continue;
        }

        const lower = relativePath.toLowerCase();
        const isImage = imageExtensions.some((ext) => lower.endsWith(ext));

        if (isImage) {
          const blob = await zipEntry.async("blob");
          const mimeType = blob.type || (lower.endsWith(".png") ? "image/png" : "image/jpeg");
          const base64 = await fileToBase64(new File([blob], zipEntry.name, { type: mimeType }));

          const fileName = relativePath.split("/").pop() || zipEntry.name;

          extractedImages.push({
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: fileName,
            source: "zip",
            base64,
            size: blob.size,
            mimeType,
          });
        }
      }

      if (extractedImages.length > 0) {
        onImagesChange([...images, ...extractedImages]);
      } else {
        alert("No valid images found inside the uploaded ZIP archive.");
      }
    } catch (err: any) {
      console.error("ZIP extraction error:", err);
      alert("Failed to unzip file: " + (err.message || "Invalid archive"));
    } finally {
      setIsExtractingZip(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  // 2. Handle Multiple Files
  const handleMultipleFiles = async (fileList: FileList) => {
    const loadedImages: AnswerImage[] = [];
    const files = Array.from(fileList).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        loadedImages.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          source: "file",
          base64,
          size: file.size,
          mimeType: file.type,
        });
      }
    }

    if (loadedImages.length > 0) {
      onImagesChange([...images, ...loadedImages]);
    }
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  // 3. Handle ImgBB links extraction
  const handleFetchImgbb = async () => {
    const links = parseImgbbLinks(imgbbText);
    if (links.length === 0) {
      alert("No valid ImgBB viewer links found. Please paste links like: https://ibb.co/xyz");
      return;
    }

    setIsFetchingImgbb(true);
    setImgbbStatus(`Extracting ${links.length} images from ImgBB...`);

    try {
      const res = await fetch("/api/extract-imgbb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: links }),
      });

      let data: any = {};
      const resText = await res.text();
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(
          res.status >= 500
            ? `Server error (${res.status}): Please ensure your backend is deployed properly.`
            : `Invalid server response: ${resText.slice(0, 120)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch images from ImgBB");
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        onImagesChange([...images, ...data.images]);
        setImgbbStatus(`Successfully extracted ${data.images.length} images!`);
        setImgbbText("");
        setTimeout(() => setImgbbStatus(null), 4000);
      } else {
        setImgbbStatus("No images could be extracted from provided links.");
      }
    } catch (err: any) {
      console.error("ImgBB fetch error:", err);
      alert("ImgBB extraction error: " + err.message);
      setImgbbStatus(null);
    } finally {
      setIsFetchingImgbb(false);
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const clearAllImages = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (filesInputRef.current) filesInputRef.current.value = "";
    if (zipInputRef.current) zipInputRef.current.value = "";
    onImagesChange([]);
    setImgbbStatus(null);
  };

  return (
    <div id="answer-images-panel" className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-3.5 sm:p-5 flex flex-col h-full transition-colors">
      {/* Header with Responsive Tab Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
            2
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                Answer Screenshots
              </h2>
              {images.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 shrink-0">
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">
              Zip archive, photo files, or ImgBB code links
            </p>
          </div>
        </div>

        {/* Source Switcher: Photos (Default, Multi-select), ZIP File, ImgBB */}
        <div className="grid grid-cols-3 sm:flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl sm:rounded-lg border border-neutral-200/80 dark:border-neutral-700 text-xs shrink-0 w-full sm:w-auto">
          <button
            id="tab-source-files"
            type="button"
            onClick={() => setActiveTab("files")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-md font-semibold text-xs transition-all whitespace-nowrap min-h-[38px] sm:min-h-0 cursor-pointer ${
              activeTab === "files"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Photos (Multiple)</span>
          </button>
          <button
            id="tab-source-zip"
            type="button"
            onClick={() => setActiveTab("zip")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-md font-semibold text-xs transition-all whitespace-nowrap min-h-[38px] sm:min-h-0 cursor-pointer ${
              activeTab === "zip"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 shrink-0" />
            <span>ZIP File</span>
          </button>
          <button
            id="tab-source-imgbb"
            type="button"
            onClick={() => setActiveTab("imgbb")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-md font-semibold text-xs transition-all whitespace-nowrap min-h-[38px] sm:min-h-0 cursor-pointer ${
              activeTab === "imgbb"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>ImgBB</span>
          </button>
        </div>
      </div>

      {/* Input options */}
      <div className="mb-4">
        {activeTab === "files" && (
          <div
            onClick={() => filesInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleMultipleFiles(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[115px] ${
              isDraggingOver
                ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 scale-[1.01]"
                : "border-neutral-300 dark:border-neutral-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30"
            }`}
          >
            <input
              ref={filesInputRef}
              type="file"
              accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleMultipleFiles(e.target.files);
                }
              }}
            />
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Click to Choose Multiple Photos (or Drag &amp; Drop)
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Select 1, 5, 10, 20 or 40+ screenshots at once (PNG, JPG, WEBP)
            </p>
          </div>
        )}

        {activeTab === "zip" && (
          <div
            onClick={() => zipInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[115px]"
          >
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleZipUpload(e.target.files[0]);
                }
              }}
            />
            {isExtractingZip ? (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Unzipping and reading images...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Upload ZIP Archive containing screenshots
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Unpacks all screenshots in order automatically
                </p>
              </>
            )}
          </div>
        )}

        {activeTab === "imgbb" && (
          <div className="space-y-2">
            <div className="relative">
              <textarea
                id="imgbb-links-input"
                value={imgbbText}
                onChange={(e) => setImgbbText(e.target.value)}
                disabled={isFetchingImgbb || isProcessing}
                placeholder={`Paste ImgBB viewer links separated by newlines (supports 1 to 40+ links):\nhttps://ibb.co/aBcDeFg\nhttps://ibb.co/hIjKlMn\nhttps://i.ibb.co/direct-link.png`}
                className="w-full h-24 p-2.5 text-xs font-mono bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />
              {parseImgbbLinks(imgbbText).length > 0 && (
                <div className="absolute right-2.5 bottom-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 shadow-2xs pointer-events-none">
                  {parseImgbbLinks(imgbbText).length} link{parseImgbbLinks(imgbbText).length === 1 ? "" : "s"} detected
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
                {imgbbStatus ? (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium break-words">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {imgbbStatus}
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400">Supports ibb.co/xyz or direct i.ibb.co links</span>
                )}
              </div>
              <button
                id="fetch-imgbb-btn"
                type="button"
                onClick={handleFetchImgbb}
                disabled={isFetchingImgbb || !imgbbText.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px] sm:min-h-0"
              >
                {isFetchingImgbb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Extract from ImgBB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gallery of loaded images */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Loaded Screenshots ({images.length})
          </span>
          {images.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                id="add-more-photos-btn"
                type="button"
                onClick={() => filesInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-2 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                title="Choose more screenshots to add"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add more</span>
              </button>
              <button
                id="clear-all-images-btn"
                type="button"
                onClick={clearAllImages}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Remove all loaded screenshots immediately"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 rounded-xl p-4 text-center">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">No screenshots loaded yet.</p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">Upload a zip, select images, or paste ImgBB viewer links above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-[220px] p-1 border border-neutral-100 dark:border-neutral-800 rounded-xl bg-neutral-50/30 dark:bg-neutral-850/50">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="aspect-video w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative">
                  <img
                    src={img.base64}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPreviewImage(img)}
                      className="p-1.5 bg-white/90 dark:bg-neutral-800/90 hover:bg-white dark:hover:bg-neutral-700 text-neutral-800 dark:text-white rounded-md transition-colors"
                      title="Zoom preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="p-1.5 bg-white/90 dark:bg-neutral-800/90 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 rounded-md transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate" title={img.name}>
                    {idx + 1}. {img.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    <span className="uppercase">{img.source}</span>
                    {img.size ? <span>{formatBytes(img.size)}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
