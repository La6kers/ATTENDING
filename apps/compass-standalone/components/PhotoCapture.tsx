// ============================================================
// COMPASS Standalone — Photo Capture Modal
// Camera capture + file upload for clinical images
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, X, SwitchCamera, Check, RotateCcw, Image as ImageIcon,
} from 'lucide-react';

interface PhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string, mimeType: string) => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ isOpen, onClose, onCapture }) => {
  const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
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
    } catch (err) {
      setCameraError('Camera access denied or not available. Please use file upload instead.');
      setMode('choose');
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount/close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('choose');
      setCapturedImage(null);
      setCameraError(null);
    }
  }, [isOpen, stopCamera]);

  // Resize image to max dimensions while preserving aspect ratio
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

  // Take photo from camera
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const dataUrl = resizeImage(videoRef.current);
    setCapturedImage(dataUrl);
    stopCamera();
    setMode('preview');
  }, [stopCamera, resizeImage]);

  // Handle file upload (with resize)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Load into an Image to resize before storing
      const img = new Image();
      img.onload = () => {
        const resized = resizeImage(img);
        setCapturedImage(resized || reader.result as string);
        setMode('preview');
      };
      img.onerror = () => {
        // Fallback: use raw data URL if resize fails
        setCapturedImage(reader.result as string);
        setMode('preview');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  // Confirm selection
  const handleConfirm = useCallback(() => {
    if (!capturedImage) return;
    // Extract base64 and mime type from data URL
    const match = capturedImage.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      onCapture(match[2], match[1]);
    }
    onClose();
  }, [capturedImage, onCapture, onClose]);

  // Retake
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setMode('choose');
  }, []);

  // Toggle camera
  const toggleFacing = useCallback(() => {
    stopCamera();
    setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
  }, [stopCamera]);

  // Auto-start camera when facing changes while in camera mode
  useEffect(() => {
    if (mode === 'camera') startCamera();
  }, [facingMode]); // eslint-disable-line

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0A2D3D] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-white">
            {mode === 'choose' ? 'Add Photo' : mode === 'camera' ? 'Take Photo' : 'Review Photo'}
          </h3>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-white/60 mb-4">
                Upload a photo of your condition for AI-powered visual analysis.
              </p>

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
                  <p className="text-xs text-white/50">Use your camera to capture an image</p>
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

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="bg-white/5 rounded-lg p-3 mt-3">
                <p className="text-[11px] text-white/40">
                  Accepted: Skin conditions, wounds, rashes, throat, eyes, medication labels, documents.
                  Photos are analyzed by AI for clinical decision support only.
                </p>
              </div>
            </div>
          )}

          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Camera switch */}
                <button
                  onClick={toggleFacing}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </div>

              {/* Shutter button */}
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

          {mode === 'preview' && capturedImage && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full max-h-[50vh] object-contain"
                />
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
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-attending-primary hover:bg-attending-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Use Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
