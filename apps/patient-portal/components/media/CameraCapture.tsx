// ============================================================
// ATTENDING AI - Camera Capture Component
// apps/patient-portal/components/media/CameraCapture.tsx
//
// Photo/video capture for visual symptom documentation
// Revolutionary Feature: Visual symptom evidence for providers
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Loader2, Video, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose?: () => void;
  mode?: 'photo' | 'video' | 'both';
  maxDuration?: number; // seconds for video
  quality?: 'low' | 'medium' | 'high';
  facingMode?: 'user' | 'environment';
  showGuide?: boolean;
  guideText?: string;
  className?: string;
}

type CaptureMode = 'photo' | 'video';
type CameraState = 'initializing' | 'ready' | 'capturing' | 'preview' | 'error';

export function CameraCapture({
  onCapture,
  onClose,
  mode = 'both',
  maxDuration = 30,
  quality = 'high',
  facingMode: initialFacingMode = 'environment',
  showGuide = true,
  guideText = 'Position the affected area in the frame',
  className = '',
}: CameraCaptureProps) {
  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const qualitySettings = {
    low: { width: 640, height: 480 },
    medium: { width: 1280, height: 720 },
    high: { width: 1920, height: 1080 },
  };

  // Check for multiple cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    });
  }, []);

  // Initialize camera
  const initCamera = useCallback(async () => {
    setCameraState('initializing');
    setError(null);

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: qualitySettings[quality].width },
          height: { ideal: qualitySettings[quality].height },
        },
        audio: captureMode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('ready');
    } catch (err: any) {
      console.error('[CameraCapture] Error:', err);
      let errorMessage = 'Failed to access camera';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application.';
      }

      setError(errorMessage);
      setCameraState('error');
    }
  }, [facingMode, quality, captureMode]);

  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [initCamera]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply zoom
    if (zoom > 1) {
      const zoomWidth = video.videoWidth / zoom;
      const zoomHeight = video.videoHeight / zoom;
      const offsetX = (video.videoWidth - zoomWidth) / 2;
      const offsetY = (video.videoHeight - zoomHeight) / 2;
      ctx.drawImage(video, offsetX, offsetY, zoomWidth, zoomHeight, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0);
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `symptom-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          setCapturedFile(file);
          setPreviewUrl(url);
          setCameraState('preview');
        }
      },
      'image/jpeg',
      0.9
    );
  }, [zoom]);

  // Start video recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `symptom-video-${Date.now()}.webm`, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCapturedFile(file);
      setPreviewUrl(url);
      setCameraState('preview');
      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
    setCameraState('capturing');

    // Recording timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxDuration - 1) {
          stopRecording();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  }, [maxDuration]);

  // Stop video recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Retake
  const retake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedFile(null);
    setCameraState('ready');
  }, [previewUrl]);

  // Confirm capture
  const confirmCapture = useCallback(() => {
    if (capturedFile && previewUrl) {
      onCapture(capturedFile, previewUrl);
    }
  }, [capturedFile, previewUrl, onCapture]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-black rounded-2xl overflow-hidden ${className}`}>
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video preview / Camera feed */}
      <div className="relative aspect-[4/3] bg-gray-900">
        {cameraState === 'preview' && previewUrl ? (
          captureMode === 'photo' ? (
            <img src={previewUrl} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video src={previewUrl} className="w-full h-full object-contain" controls autoPlay loop muted />
          )
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Loading overlay */}
        {cameraState === 'initializing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {cameraState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center p-4">
              <Camera className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-white text-sm mb-2">{error}</p>
              <button
                onClick={initCamera}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Guide overlay */}
        {showGuide && cameraState === 'ready' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/30 rounded-2xl" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                {guideText}
              </span>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
            <span className="text-xs opacity-75">/ {formatTime(maxDuration)}</span>
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4">
        {cameraState === 'preview' ? (
          /* Preview controls */
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={retake}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
            <button
              onClick={confirmCapture}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Use {captureMode === 'photo' ? 'Photo' : 'Video'}
            </button>
          </div>
        ) : (
          /* Capture controls */
          <div className="flex items-center justify-between">
            {/* Mode switcher */}
            {mode === 'both' && (
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setCaptureMode('photo')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    captureMode === 'photo' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Photo
                </button>
                <button
                  onClick={() => setCaptureMode('video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    captureMode === 'video' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Video
                </button>
              </div>
            )}

            {/* Capture button */}
            <div className="flex-1 flex justify-center">
              {captureMode === 'photo' ? (
                <button
                  onClick={capturePhoto}
                  disabled={cameraState !== 'ready'}
                  className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:border-purple-400 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                           active:scale-95 active:bg-gray-100"
                  aria-label="Take photo"
                />
              ) : (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={cameraState !== 'ready' && cameraState !== 'capturing'}
                  className={`w-16 h-16 rounded-full border-4 transition-all active:scale-95
                           disabled:opacity-50 disabled:cursor-not-allowed
                           ${isRecording 
                             ? 'bg-red-600 border-red-400 hover:bg-red-700' 
                             : 'bg-red-500 border-gray-300 hover:border-red-400'
                           }`}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording && <div className="w-6 h-6 bg-white rounded-sm mx-auto" />}
                </button>
              )}
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center bg-gray-800 rounded-lg">
                <button
                  onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  disabled={zoom <= 1}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-white text-xs w-8 text-center">{zoom}x</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                  disabled={zoom >= 3}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Switch camera */}
              {hasMultipleCameras && (
                <button
                  onClick={switchCamera}
                  className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraCapture;
