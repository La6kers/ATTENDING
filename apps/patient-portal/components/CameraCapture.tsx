// ============================================================
// Camera Capture Component for COMPASS Patient Portal
// apps/patient-portal/components/CameraCapture.tsx
//
// Photo capture for symptom documentation (rashes, wounds, etc.)
// Supports front/back camera switching and image annotation
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Trash2, FlipHorizontal, ZoomIn, ZoomOut } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface CapturedImage {
  id: string;
  dataUrl: string;
  blob: Blob;
  timestamp: Date;
  label?: string;
  bodyPart?: string;
}

export interface CameraCaptureProps {
  /** Maximum number of images that can be captured */
  maxImages?: number;
  /** Whether to show body part selector */
  showBodyPartSelector?: boolean;
  /** Callback when images change */
  onImagesChange?: (images: CapturedImage[]) => void;
  /** Callback when capture is complete */
  onComplete?: (images: CapturedImage[]) => void;
  /** Callback to close the camera */
  onClose?: () => void;
  /** Initial body part selection */
  defaultBodyPart?: string;
  /** Custom class name */
  className?: string;
}

// Body parts for labeling
const BODY_PARTS = [
  'Head', 'Face', 'Neck', 'Chest', 'Back', 'Abdomen',
  'Left Arm', 'Right Arm', 'Left Hand', 'Right Hand',
  'Left Leg', 'Right Leg', 'Left Foot', 'Right Foot',
  'Other',
];

// ============================================================
// COMPONENT
// ============================================================

export function CameraCapture({
  maxImages = 5,
  showBodyPartSelector = true,
  onImagesChange,
  onComplete,
  onClose,
  defaultBodyPart,
  className = '',
}: CameraCaptureProps) {
  // State
  const [isActive, setIsActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>(defaultBodyPart || '');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<CapturedImage | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
    } catch (err: any) {
      console.error('[Camera] Error starting camera:', err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Failed to start camera. Please try again.'
      );
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (isActive) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply zoom if needed
    if (zoom !== 1) {
      const zoomWidth = canvas.width / zoom;
      const zoomHeight = canvas.height / zoom;
      const startX = (canvas.width - zoomWidth) / 2;
      const startY = (canvas.height - zoomHeight) / 2;
      
      context.drawImage(
        video,
        startX, startY, zoomWidth, zoomHeight,
        0, 0, canvas.width, canvas.height
      );
    } else {
      context.drawImage(video, 0, 0);
    }

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) return;

      const id = `img-${Date.now()}`;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      const newImage: CapturedImage = {
        id,
        dataUrl,
        blob,
        timestamp: new Date(),
        bodyPart: selectedBodyPart || undefined,
      };

      setCapturedImages(prev => {
        const updated = [...prev, newImage];
        onImagesChange?.(updated);
        return updated;
      });

      // Show preview
      setPreviewImage(newImage);
      setShowPreview(true);

    }, 'image/jpeg', 0.9);
  }, [zoom, selectedBodyPart, onImagesChange]);

  // Delete image
  const deleteImage = useCallback((id: string) => {
    setCapturedImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      onImagesChange?.(updated);
      return updated;
    });
  }, [onImagesChange]);

  // Update image label
  const updateImageLabel = useCallback((id: string, label: string) => {
    setCapturedImages(prev => {
      const updated = prev.map(img =>
        img.id === id ? { ...img, label } : img
      );
      onImagesChange?.(updated);
      return updated;
    });
  }, [onImagesChange]);

  // Handle complete
  const handleComplete = useCallback(() => {
    stopCamera();
    onComplete?.(capturedImages);
  }, [stopCamera, capturedImages, onComplete]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    onClose?.();
  }, [stopCamera, onClose]);

  // Accept preview
  const acceptPreview = useCallback(() => {
    setShowPreview(false);
    setPreviewImage(null);
  }, []);

  // Retake photo
  const retakePhoto = useCallback(() => {
    if (previewImage) {
      deleteImage(previewImage.id);
    }
    setShowPreview(false);
    setPreviewImage(null);
  }, [previewImage, deleteImage]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.5, 1));
  }, []);

  return (
    <div className={`fixed inset-0 z-50 bg-black flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close camera"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-lg font-medium">
          Capture Photo {capturedImages.length > 0 && `(${capturedImages.length}/${maxImages})`}
        </h2>
        
        {capturedImages.length > 0 && (
          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        )}
        {capturedImages.length === 0 && <div className="w-16" />}
      </div>

      {/* Camera view or preview */}
      <div className="flex-1 relative overflow-hidden">
        {!isActive && !showPreview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
            {error ? (
              <>
                <p className="text-red-400 mb-4 text-center">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </>
            ) : (
              <button
                onClick={startCamera}
                className="flex flex-col items-center gap-3 p-8 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"
              >
                <Camera className="w-16 h-16" />
                <span className="text-lg font-medium">Start Camera</span>
              </button>
            )}
          </div>
        )}

        {/* Video preview */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${!isActive || showPreview ? 'hidden' : ''}`}
          playsInline
          muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Captured image preview */}
        {showPreview && previewImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <img
              src={previewImage.dataUrl}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Zoom indicator */}
        {isActive && !showPreview && zoom !== 1 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black/50 text-white rounded-full text-sm">
            {zoom.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Body part selector */}
      {showBodyPartSelector && isActive && !showPreview && (
        <div className="bg-black/80 p-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {BODY_PARTS.map(part => (
              <button
                key={part}
                onClick={() => setSelectedBodyPart(part)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedBodyPart === part
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {part}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-black p-4">
        {showPreview && previewImage ? (
          /* Preview controls */
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={retakePhoto}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
              aria-label="Retake photo"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={acceptPreview}
              className="p-5 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              aria-label="Accept photo"
            >
              <Check className="w-8 h-8 text-white" />
            </button>
          </div>
        ) : isActive ? (
          /* Camera controls */
          <div className="flex items-center justify-between">
            {/* Zoom out */}
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="p-3 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-6 h-6 text-white" />
            </button>

            {/* Capture button */}
            <button
              onClick={captureImage}
              disabled={capturedImages.length >= maxImages}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center disabled:opacity-30 hover:scale-95 transition-transform"
              aria-label="Capture photo"
            >
              <div className="w-16 h-16 bg-white border-4 border-black rounded-full" />
            </button>

            {/* Zoom in */}
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-3 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-6 h-6 text-white" />
            </button>
          </div>
        ) : (
          /* Inactive - no controls */
          <div className="h-20" />
        )}

        {/* Switch camera button */}
        {isActive && !showPreview && (
          <button
            onClick={switchCamera}
            className="absolute bottom-24 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            aria-label="Switch camera"
          >
            <FlipHorizontal className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {capturedImages.length > 0 && (
        <div className="bg-black/80 p-3 overflow-x-auto">
          <div className="flex gap-2">
            {capturedImages.map((img) => (
              <div key={img.id} className="relative flex-shrink-0">
                <img
                  src={img.dataUrl}
                  alt={img.label || 'Captured'}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  onClick={() => deleteImage(img.id)}
                  className="absolute -top-1 -right-1 p-1 bg-red-600 rounded-full"
                  aria-label="Delete image"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
                {img.bodyPart && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b-lg truncate">
                    {img.bodyPart}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraCapture;
