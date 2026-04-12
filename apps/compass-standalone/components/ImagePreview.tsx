// ============================================================
// COMPASS Standalone — Image Preview + Lightbox
// Thumbnail in chat, full-size lightbox on click
// ============================================================

import React, { useState } from 'react';
import { X, ZoomIn, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

// ============================================================
// Staged Image Preview (in input area before sending)
// ============================================================

interface StagedImageProps {
  dataUrl: string;
  onRemove: () => void;
  isAnalyzing?: boolean;
}

export const StagedImagePreview: React.FC<StagedImageProps> = ({ dataUrl, onRemove, isAnalyzing }) => (
  <div className="relative inline-block mr-2 mb-2">
    <img
      src={dataUrl}
      alt="Staged"
      className="w-16 h-16 rounded-lg object-cover border-2 border-white/20"
    />
    {isAnalyzing && (
      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-attending-light-teal animate-spin" />
      </div>
    )}
    <button
      onClick={onRemove}
      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

// ============================================================
// Chat Message Image (inline in message bubble)
// ============================================================

interface ChatImageProps {
  dataUrl: string;
  alt?: string;
}

export const ChatImage: React.FC<ChatImageProps> = ({ dataUrl, alt }) => {
  const [showLightbox, setShowLightbox] = useState(false);

  return (
    <>
      <div
        className="relative cursor-pointer group rounded-lg overflow-hidden mt-2 mb-1"
        onClick={() => setShowLightbox(true)}
      >
        <img
          src={dataUrl}
          alt={alt || 'Clinical image'}
          className="max-w-[240px] max-h-[180px] rounded-lg object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {showLightbox && (
        <ImageLightbox dataUrl={dataUrl} alt={alt} onClose={() => setShowLightbox(false)} />
      )}
    </>
  );
};

// ============================================================
// Image Analysis Card (shown in assistant message)
// ============================================================

interface ImageAnalysis {
  imageDescription: string;
  findings: string[];
  suggestedConditions: { name: string; confidence: number; reasoning: string }[];
  urgency: string;
  recommendations: string[];
  provider: string;
}

interface AnalysisCardProps {
  analysis: ImageAnalysis;
}

export const ImageAnalysisCard: React.FC<AnalysisCardProps> = ({ analysis }) => {
  const urgencyColor = analysis.urgency === 'emergent'
    ? 'border-red-500/40 bg-red-900/20'
    : analysis.urgency === 'urgent'
      ? 'border-amber-500/40 bg-amber-900/20'
      : 'border-teal-500/30 bg-teal-900/20';

  return (
    <div className={`rounded-lg border p-3 mt-2 ${urgencyColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-4 h-4 text-attending-light-teal flex-shrink-0" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Image Analysis</span>
        <span className="text-[10px] text-white/30 ml-auto">{analysis.provider}</span>
      </div>

      <p className="text-sm text-white/80 mb-2">{analysis.imageDescription}</p>

      {analysis.findings.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-semibold text-white/50 uppercase">Findings</span>
          <ul className="mt-1 space-y-0.5">
            {analysis.findings.map((f, i) => (
              <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                <span className="text-attending-light-teal mt-0.5">+</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.suggestedConditions.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-semibold text-white/50 uppercase">Possible Conditions</span>
          <div className="mt-1 space-y-1">
            {analysis.suggestedConditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white/70">{c.confidence}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/90">{c.name}</p>
                  <p className="text-[10px] text-white/50 truncate">{c.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.urgency !== 'routine' && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
          <AlertTriangle className={`w-3.5 h-3.5 ${analysis.urgency === 'emergent' ? 'text-red-400' : 'text-amber-400'}`} />
          <span className={`text-xs font-medium ${analysis.urgency === 'emergent' ? 'text-red-300' : 'text-amber-300'}`}>
            {analysis.urgency === 'emergent' ? 'Emergent — seek immediate care' : 'Urgent — prompt evaluation recommended'}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Lightbox (full-screen image viewer)
// ============================================================

interface LightboxProps {
  dataUrl: string;
  alt?: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<LightboxProps> = ({ dataUrl, alt, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={onClose}>
    <button
      onClick={onClose}
      className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-10"
    >
      <X className="w-6 h-6" />
    </button>
    <img
      src={dataUrl}
      alt={alt || 'Full size'}
      className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);
