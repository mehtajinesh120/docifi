import React from "react";
import { X, Download, ExternalLink } from "lucide-react";
import { AnswerImage } from "../types";

interface ImagePreviewModalProps {
  image: AnswerImage | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  onClose,
}) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between text-white">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-semibold truncate">{image.name}</h3>
            {image.rationale && (
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{image.rationale}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={image.base64}
              download={image.name}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
          <img
            src={image.base64}
            alt={image.name}
            className="max-h-[75vh] max-w-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
