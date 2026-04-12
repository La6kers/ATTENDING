// ============================================================
// COMPASS Standalone — Guided Photo Capture Modal
// Body region selection → photo guidance → multi-angle capture
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, X, SwitchCamera, Check, RotateCcw, ChevronRight,
  ChevronLeft, Plus, MapPin, Info,
} from 'lucide-react';
import { BODY_REGIONS, type BodyRegion, type PhotoShot } from '../lib/bodyRegions';

interface CapturedPhoto {
  dataUrl: string;
  shotLabel: string;
  shotId: string;
}

interface PhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string, mimeType: string, bodyRegion?: string, shotLabel?: string) => void;
  /** When true, sends all photos at once via onCaptureAll */
  onCaptureAll?: (photos: { base64: string; mimeType: string; bodyRegion: string; shotLabel: string }[]) => void;
}

type ModalMode = 'region' | 'guidance' | 'choose' | 'camera' | 'preview' | 'review';

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ isOpen, onClose, onCapture, onCaptureAll }) => {
  const [mode, setMode] = useState<ModalMode>('region');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Guided flow state
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera controls (unchanged from original)
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode('camera');
    } catch (_err) {
      setCameraError('Camera access denied or not available. Please use file upload instead.');
      setMode('choose');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('region');
      setCapturedImage(null);
      setCameraError(null);
      setSelectedRegion(null);
      setCurrentShotIndex(0);
      setCapturedPhotos([]);
    }
  }, [isOpen, stopCamera]);

  // Resize helper
  const resizeImage = useCallback((source: HTMLVideoElement | HTMLImageElement, maxW = 800, maxH = 600): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    let sw: number, sh: number;
    if (source instanceof HTMLVideoElement) {
      sw = source.videoWidth; sh = source.videoHeight;
    } else {
      sw = source.naturalWidth; sh = source.naturalHeight;
    }

    let dw = sw, dh = sh;
    if (dw > maxW || dh > maxH) {
      const ratio = Math.min(maxW / dw, maxH / dh);
      dw = Math.round(dw * ratio);
      dh = Math.round(dh * ratio);
    }

    canvas.width = dw;
    canvas.height = dh;
    ctx.drawImage(source, 0, 0, dw, dh);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const dataUrl = resizeImage(videoRef.current);
    setCapturedImage(dataUrl);
    stopCamera();
    setMode('preview');
  }, [stopCamera, resizeImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const resized = resizeImage(img);
        setCapturedImage(resized || reader.result as string);
        setMode('preview');
      };
      img.onerror = () => {
        setCapturedImage(reader.result as string);
        setMode('preview');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [resizeImage]);

  const toggleFacing = useCallback(() => {
    stopCamera();
    setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
  }, [stopCamera]);

  useEffect(() => {
    if (mode === 'camera') startCamera();
  }, [facingMode]); // eslint-disable-line

  // === Guided flow handlers ===

  const handleSelectRegion = useCallback((region: BodyRegion) => {
    setSelectedRegion(region);
    setCurrentShotIndex(0);
    setCapturedPhotos([]);
    setMode('guidance');
  }, []);

  const currentShot: PhotoShot | null = selectedRegion
    ? selectedRegion.photoGuide.shots[currentShotIndex] || null
    : null;

  const handleConfirmPhoto = useCallback(() => {
    if (!capturedImage || !selectedRegion || !currentShot) return;
    // Add to captured photos
    setCapturedPhotos(prev => [...prev, {
      dataUrl: capturedImage,
      shotLabel: currentShot.label,
      shotId: currentShot.id,
    }]);
    setCapturedImage(null);

    // Check if there are more shots
    const nextIndex = currentShotIndex + 1;
    const shots = selectedRegion.photoGuide.shots;
    if (nextIndex < shots.length) {
      setCurrentShotIndex(nextIndex);
      setMode('guidance');
    } else {
      setMode('review');
    }
  }, [capturedImage, selectedRegion, currentShot, currentShotIndex]);

  const handleSkipToReview = useCallback(() => {
    if (!capturedImage) {
      setMode('review');
      return;
    }
    // Save current photo then go to review
    if (selectedRegion && currentShot) {
      setCapturedPhotos(prev => [...prev, {
        dataUrl: capturedImage,
        shotLabel: currentShot.label,
        shotId: currentShot.id,
      }]);
    }
    setCapturedImage(null);
    setMode('review');
  }, [capturedImage, selectedRegion, currentShot]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setMode('choose');
  }, []);

  const handleUsePhotos = useCallback(() => {
    if (capturedPhotos.length === 0) return;
    const regionId = selectedRegion?.id || 'other';

    if (onCaptureAll) {
      // Send all photos at once
      const photos = capturedPhotos.map(p => {
        const match = p.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        return {
          base64: match ? match[2] : '',
          mimeType: match ? match[1] : 'image/jpeg',
          bodyRegion: regionId,
          shotLabel: p.shotLabel,
        };
      }).filter(p => p.base64);
      onCaptureAll(photos);
    } else {
      // Send first photo via legacy single-photo callback
      const first = capturedPhotos[0];
      const match = first.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        onCapture(match[2], match[1], regionId, first.shotLabel);
      }
    }
    onClose();
  }, [capturedPhotos, selectedRegion, onCapture, onCaptureAll, onClose]);

  const handleAddAnother = useCallback(() => {
    const shots = selectedRegion?.photoGuide.shots || [];
    // Find next uncaptured shot or allow free capture
    const nextIndex = Math.min(capturedPhotos.length, shots.length - 1);
    setCurrentShotIndex(nextIndex);
    setMode('guidance');
  }, [selectedRegion, capturedPhotos]);

  if (!isOpen) return null;

  const totalShots = selectedRegion?.photoGuide.shots.length || 0;
  const photoNumber = capturedPhotos.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative bg-[#0A2D3D] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {mode !== 'region' && (
              <button
                onClick={() => {
                  if (mode === 'guidance') setMode('region');
                  else if (mode === 'choose' || mode === 'camera') setMode('guidance');
                  else if (mode === 'preview') { setCapturedImage(null); setMode('choose'); }
                  else if (mode === 'review') setMode('guidance');
                }}
                className="p-1 text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-semibold text-white text-sm">
              {mode === 'region' && 'Where is your concern?'}
              {mode === 'guidance' && (selectedRegion?.label || 'Photo Guide')}
              {mode === 'choose' && `Photo ${photoNumber} of ${totalShots}`}
              {mode === 'camera' && (currentShot?.label || 'Take Photo')}
              {mode === 'preview' && 'Review Photo'}
              {mode === 'review' && `${capturedPhotos.length} Photo${capturedPhotos.length !== 1 ? 's' : ''} Captured`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh]">

          {/* ============ STEP 1: BODY REGION SELECTOR ============ */}
          {mode === 'region' && (
            <div className="space-y-3">
              <p className="text-sm text-white/60 mb-2">
                Select the body area to get specific photo guidance for your provider.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BODY_REGIONS.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => handleSelectRegion(region)}
                    className="flex items-center gap-2.5 p-3 bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl transition-colors text-left"
                  >
                    <span className="text-xl flex-shrink-0">{region.icon}</span>
                    <span className="text-sm font-medium text-white">{region.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============ STEP 2: PHOTO GUIDANCE ============ */}
          {mode === 'guidance' && selectedRegion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-medium text-teal-300">{selectedRegion.label}</span>
              </div>

              <p className="text-sm text-white/70">
                We need {selectedRegion.photoGuide.shots.filter(s => s.required).length}-{selectedRegion.photoGuide.shots.length} photos for the best assessment:
              </p>

              <div className="space-y-2">
                {selectedRegion.photoGuide.shots.map((shot, i) => {
                  const isCompleted = capturedPhotos.some(p => p.shotId === shot.id);
                  const isCurrent = i === currentShotIndex && !isCompleted;
                  return (
                    <div
                      key={shot.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isCompleted
                          ? 'bg-teal-900/30 border-teal-500/30'
                          : isCurrent
                            ? 'bg-white/10 border-attending-primary/50'
                            : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted ? 'bg-teal-500 text-white' : isCurrent ? 'bg-attending-primary text-white' : 'bg-white/10 text-white/40'
                        }`}>
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-white">{shot.label}</span>
                          {!shot.required && <span className="text-[10px] text-white/40 ml-1.5">(optional)</span>}
                        </div>
                      </div>
                      <p className="text-xs text-white/50 mt-1 ml-8">{shot.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Tips */}
              {selectedRegion.photoGuide.tips.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-300">Tips</span>
                  </div>
                  <ul className="space-y-1">
                    {selectedRegion.photoGuide.tips.map((tip, i) => (
                      <li key={i} className="text-[11px] text-amber-200/70">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setMode('choose')}
                className="w-full py-3 bg-attending-primary hover:bg-attending-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                {capturedPhotos.length === 0 ? 'Start Taking Photos' : `Take ${currentShot?.label || 'Next Photo'}`}
                <ChevronRight className="w-4 h-4" />
              </button>

              {capturedPhotos.length > 0 && (
                <button
                  onClick={() => setMode('review')}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors border border-white/10"
                >
                  Review {capturedPhotos.length} Photo{capturedPhotos.length !== 1 ? 's' : ''} →
                </button>
              )}
            </div>
          )}

          {/* ============ STEP 3: CHOOSE CAMERA/UPLOAD ============ */}
          {mode === 'choose' && (
            <div className="space-y-3">
              {currentShot && (
                <div className="bg-teal-900/20 border border-teal-500/20 rounded-lg p-2.5 mb-2">
                  <p className="text-xs text-teal-300 font-medium">{currentShot.label}: {currentShot.description}</p>
                </div>
              )}

              {cameraError && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 mb-3">
                  {cameraError}
                </div>
              )}

              <button
                onClick={startCamera}
                className="w-full flex items-center gap-3 p-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-attending-primary/20 rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-attending-light-teal" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Take Photo</p>
                  <p className="text-xs text-white/50">Use your camera</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-attending-primary/20 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-attending-light-teal" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Upload from Gallery</p>
                  <p className="text-xs text-white/50">Choose an existing photo</p>
                </div>
              </button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
          )}

          {/* ============ STEP 4: CAMERA ============ */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {currentShot && (
                <div className="bg-teal-900/20 border border-teal-500/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-teal-300 font-medium">{currentShot.label}: {currentShot.description}</p>
                </div>
              )}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <button
                  onClick={toggleFacing}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white" />
                </button>
              </div>
            </div>
          )}

          {/* ============ STEP 5: PREVIEW ============ */}
          {mode === 'preview' && capturedImage && (
            <div className="space-y-3">
              {currentShot && (
                <p className="text-xs text-teal-300 font-medium text-center">{currentShot.label}</p>
              )}
              <div className="relative rounded-xl overflow-hidden bg-black">
                <img src={capturedImage} alt="Captured" className="w-full max-h-[40vh] object-contain" />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-white/10"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </button>
                <button
                  onClick={handleConfirmPhoto}
                  className="flex-1 py-3 bg-attending-primary hover:bg-attending-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {currentShotIndex < totalShots - 1 ? 'Next Photo' : 'Done'}
                </button>
              </div>

              {currentShotIndex > 0 && (
                <button
                  onClick={handleSkipToReview}
                  className="w-full py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  Skip remaining — review photos
                </button>
              )}
            </div>
          )}

          {/* ============ STEP 6: REVIEW ALL PHOTOS ============ */}
          {mode === 'review' && (
            <div className="space-y-4">
              {selectedRegion && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-medium text-teal-300">{selectedRegion.label}</span>
                  <span className="text-xs text-white/40 ml-auto">{capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              {capturedPhotos.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-10 h-10 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">No photos captured yet</p>
                  <button
                    onClick={() => setMode('guidance')}
                    className="mt-3 px-4 py-2 bg-attending-primary/20 text-teal-300 rounded-lg text-sm hover:bg-attending-primary/30 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {capturedPhotos.map((photo, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden bg-black border border-white/10">
                        <img src={photo.dataUrl} alt={photo.shotLabel} className="w-full h-28 object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-[10px] text-white font-medium">{photo.shotLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {capturedPhotos.length < totalShots && (
                    <button
                      onClick={handleAddAnother}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors border border-white/10"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Photo
                    </button>
                  )}

                  <button
                    onClick={handleUsePhotos}
                    className="w-full py-3.5 bg-attending-primary hover:bg-attending-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Use {capturedPhotos.length} Photo{capturedPhotos.length !== 1 ? 's' : ''}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
