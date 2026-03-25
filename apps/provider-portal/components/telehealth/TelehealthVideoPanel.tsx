// ============================================================
// ATTENDING AI - Telehealth Video Panel
// apps/provider-portal/components/telehealth/TelehealthVideoPanel.tsx
//
// Video visit interface with waiting room and COMPASS integration
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  Settings,
  Maximize,
  Minimize,
  Clock,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Camera,
  Volume2,
  VolumeX,
  MoreVertical,
  FileText,
  Stethoscope,
  UserPlus,
  ArrowRight,
} from 'lucide-react';

// Types
interface Participant {
  id: string;
  type: 'patient' | 'provider' | 'caregiver' | 'interpreter';
  name: string;
  isActive: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isSpeaking?: boolean;
}

interface ConnectionQuality {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  latencyMs: number;
  packetLoss: number;
}

interface WaitingRoomPatient {
  id: string;
  name: string;
  waitTime: number;
  compassComplete: boolean;
  chiefComplaint?: string;
}

interface TelehealthSession {
  id: string;
  status: 'waiting_room' | 'in_progress' | 'paused' | 'completed';
  patientName: string;
  scheduledStart: Date;
  actualStart?: Date;
  duration: number;
  recordingEnabled: boolean;
  recordingActive: boolean;
  participants: Participant[];
  connectionQuality: ConnectionQuality;
}

interface TelehealthVideoPanelProps {
  session: TelehealthSession | null;
  waitingRoom: WaitingRoomPatient[];
  onAdmitPatient: (patientId: string) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onOpenChat: () => void;
  onOpenCOMPASS: () => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export function TelehealthVideoPanel({
  session,
  waitingRoom,
  onAdmitPatient,
  onStartSession,
  onEndSession,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleRecording,
  onOpenChat,
  onOpenCOMPASS,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
}: TelehealthVideoPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Timer for session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session?.status === 'in_progress' && session.actualStart) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - new Date(session.actualStart!).getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session?.status, session?.actualStart]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && videoContainerRef.current) {
      videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const qualityColors = {
    excellent: 'text-green-500',
    good: 'text-green-400',
    fair: 'text-yellow-500',
    poor: 'text-red-500',
  };

  const qualityBars = {
    excellent: 4,
    good: 3,
    fair: 2,
    poor: 1,
  };

  // No active session - show waiting room
  if (!session || session.status === 'waiting_room') {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Telehealth</h2>
                <p className="text-cyan-200 text-sm">Waiting Room</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              <span>{waitingRoom.length} waiting</span>
            </div>
          </div>
        </div>

        {/* Waiting Room List */}
        <div className="flex-1 p-6 overflow-auto">
          {waitingRoom.length > 0 ? (
            <div className="space-y-4">
              {waitingRoom.map((patient, index) => (
                <div
                  key={patient.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-lg">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{patient.name}</div>
                        <div className="text-sm text-gray-500">
                          Waiting {patient.waitTime} min
                          {patient.chiefComplaint && (
                            <span className="ml-2">• {patient.chiefComplaint}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* COMPASS Status */}
                      <div className={`flex items-center gap-1 text-sm ${
                        patient.compassComplete ? 'text-green-600' : 'text-orange-500'
                      }`}>
                        {patient.compassComplete ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            COMPASS Ready
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            COMPASS Pending
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => onAdmitPatient(patient.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Admit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Patients Waiting</h3>
              <p className="text-sm">Patients will appear here when they join</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div ref={videoContainerRef} className="bg-gray-900 rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Main Video (Patient) */}
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          {session.participants.find(p => p.type === 'patient')?.videoEnabled ? (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              {/* Placeholder for actual video stream */}
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
                  {session.patientName.charAt(0)}
                </div>
                <p className="text-white text-lg">{session.patientName}</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Patient camera is off</p>
            </div>
          )}
        </div>

        {/* Self View (Provider) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg">
          {isVideoEnabled ? (
            <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                You
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-white text-xs">
            <span className="bg-black/50 px-2 py-0.5 rounded">You</span>
            {!isAudioEnabled && <MicOff className="w-3 h-3 text-red-400" />}
          </div>
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Session Timer */}
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg text-white">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>

              {/* Recording Indicator */}
              {session.recordingActive && (
                <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-lg text-white animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-sm">Recording</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Quality */}
              <div className="flex items-center gap-2 text-white">
                <div className="flex items-end gap-0.5">
                  {[1, 2, 3, 4].map(bar => (
                    <div
                      key={bar}
                      className={`w-1 rounded-t ${
                        bar <= qualityBars[session.connectionQuality.overall]
                          ? qualityColors[session.connectionQuality.overall]
                          : 'bg-gray-600'
                      }`}
                      style={{ height: `${bar * 4}px` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-300">{session.connectionQuality.latencyMs}ms</span>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-lg text-white"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Participant Name Tag */}
        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 text-white">
            <span className="font-medium">{session.patientName}</span>
            {session.participants.find(p => p.type === 'patient')?.isSpeaking && (
              <Volume2 className="w-4 h-4 text-green-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <ControlButton
              icon={isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              label={isAudioEnabled ? 'Mute' : 'Unmute'}
              onClick={onToggleAudio}
              active={isAudioEnabled}
            />
            <ControlButton
              icon={isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              label={isVideoEnabled ? 'Stop Video' : 'Start Video'}
              onClick={onToggleVideo}
              active={isVideoEnabled}
            />
            <ControlButton
              icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
              onClick={onToggleScreenShare}
              active={isScreenSharing}
              variant="secondary"
            />
          </div>

          {/* Center - End Call */}
          <button
            onClick={onEndSession}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            End Visit
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <ControlButton
              icon={<Stethoscope className="w-5 h-5" />}
              label="COMPASS"
              onClick={onOpenCOMPASS}
              variant="accent"
            />
            <ControlButton
              icon={<MessageSquare className="w-5 h-5" />}
              label="Chat"
              onClick={onOpenChat}
              variant="secondary"
            />
            <ControlButton
              icon={<FileText className="w-5 h-5" />}
              label={session.recordingActive ? 'Stop Rec' : 'Record'}
              onClick={onToggleRecording}
              active={session.recordingActive}
              variant={session.recordingActive ? 'danger' : 'secondary'}
            />
            <ControlButton
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              onClick={() => setShowSettings(!showSettings)}
              variant="secondary"
            />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-24 right-4 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
          <h3 className="text-white font-medium mb-4">Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-2">Camera</label>
              <select className="w-full bg-gray-700 text-white rounded-lg px-3 py-2">
                <option>Default Camera</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Microphone</label>
              <select className="w-full bg-gray-700 text-white rounded-lg px-3 py-2">
                <option>Default Microphone</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Speaker</label>
              <select className="w-full bg-gray-700 text-white rounded-lg px-3 py-2">
                <option>Default Speaker</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Control Button Component
function ControlButton({
  icon,
  label,
  onClick,
  active = true,
  variant = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
}) {
  const variants = {
    primary: active
      ? 'bg-gray-600 text-white hover:bg-gray-500'
      : 'bg-red-600 text-white hover:bg-red-500',
    secondary: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white',
    accent: 'bg-purple-600 text-white hover:bg-purple-500',
    danger: 'bg-red-600 text-white hover:bg-red-500 animate-pulse',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${variants[variant]}`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

export default TelehealthVideoPanel;
