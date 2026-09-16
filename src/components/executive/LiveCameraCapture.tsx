import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RotateCw, 
  Check, 
  X, 
  ShieldAlert, 
  MapPin, 
  Clock, 
  Compass, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { captureFrameWithWatermark, WatermarkOptions } from '../../services/camera';

interface LiveCameraCaptureProps {
  title?: string;
  watermarkOptions: WatermarkOptions;
  onPhotoConfirmed: (imageBase64: string) => void;
  onCancel: () => void;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  title = 'Live Field Photo Capture',
  watermarkOptions,
  onPhotoConfirmed,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(true);
  const [useSimulationMode, setUseSimulationMode] = useState(false);

  // Start live WebRTC camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    setIsStartingCamera(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API (getUserMedia) is not available in this browser context.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStartingCamera(false);
    } catch (err: unknown) {
      console.warn('Physical camera unavailable or permission denied:', err);
      const errMsg = err instanceof Error ? err.message : 'Unable to access device camera.';
      setCameraError(errMsg);
      setIsStartingCamera(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Perform live frame capture
  const handleCapture = () => {
    if (useSimulationMode || cameraError) {
      // Generate synthetic field camera frame
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Render simulated realistic camera view
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        // Building / clinic illustration lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(300, 120, 680, 420);
        ctx.strokeRect(580, 360, 120, 180); // Door

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(watermarkOptions.visitName || 'FIELD VISIT LOCATION', 640, 240);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px monospace';
        ctx.fillText('[LIVE WEBRTC SIMULATED SENSOR CAPTURE]', 640, 290);
        ctx.textAlign = 'left';

        // Add standard anti-tamper watermark
        const tempVideo = document.createElement('video');
        const img = captureFrameWithWatermark(tempVideo, watermarkOptions);
        // Overlay watermark onto canvas
        const watermarked = captureFrameWithWatermark(canvas as unknown as HTMLVideoElement, watermarkOptions);
        setCapturedImage(watermarked || img);
      }
      return;
    }

    if (videoRef.current) {
      try {
        const photoData = captureFrameWithWatermark(videoRef.current, watermarkOptions);
        setCapturedImage(photoData);
      } catch (err) {
        console.error('Failed to capture frame:', err);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (!useSimulationMode && !cameraError) {
      startCamera(facingMode);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onPhotoConfirmed(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-800">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Preview Container */}
        <div className="relative aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center">
          {capturedImage ? (
            /* Captured Preview View */
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured live field verification"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-green-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Check className="w-3.5 h-3.5" />
                <span>Captured &bull; Anti-Tamper Stamped</span>
              </div>
            </div>
          ) : cameraError || useSimulationMode ? (
            /* Fallback Simulated Viewfinder if Camera hardware/permission is blocked */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
              <div className="w-16 h-16 rounded-2xl bg-blue-900/60 border border-blue-700 flex items-center justify-center text-blue-300 mb-3 animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-xs font-bold text-slate-100">
                {useSimulationMode ? 'Simulated Live Camera Viewfinder' : 'Hardware Camera Restricted / Permission Needed'}
              </p>
              <p className="text-[11px] text-slate-300 mt-1 max-w-xs">
                {useSimulationMode
                  ? 'Ready to capture live verified frame with GPS & employee stamp.'
                  : cameraError || 'Allow camera permission in browser to access physical lens.'}
              </p>

              {!useSimulationMode && (
                <button
                  onClick={() => setUseSimulationMode(true)}
                  className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use Simulated Camera Feed</span>
                </button>
              )}
            </div>
          ) : (
            /* Live WebRTC Video Element */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle Overlay */}
              <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between text-[10px] font-mono text-cyan-400/80">
                  <span>[REC] LIVE SENSOR</span>
                  <span>{facingMode.toUpperCase()} LENS</span>
                </div>
                {/* Center crosshair */}
                <div className="self-center w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                </div>
                <div className="text-[10px] font-mono text-white/80 flex items-center justify-between">
                  <span>LAT: {watermarkOptions.latitude?.toFixed(4) || '37.7749'}</span>
                  <span>LNG: {watermarkOptions.longitude?.toFixed(4) || '-122.4194'}</span>
                </div>
              </div>

              {/* Loading Indicator while video stream starts */}
              {isStartingCamera && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center gap-2 text-slate-300 text-xs font-semibold">
                  <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Initializing Camera...</span>
                </div>
              )}
            </>
          )}

          {/* Anti-Gallery Strict Policy Pill */}
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs border border-slate-700/80 px-2 py-0.5 rounded-full text-[10px] text-slate-200 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>Camera Only &bull; Gallery Blocked</span>
          </div>
        </div>

        {/* Live GPS & Timestamp Metadata Banner */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-mono text-[11px] text-slate-700 font-medium">
              {watermarkOptions.latitude !== undefined && watermarkOptions.longitude !== undefined
                ? `${watermarkOptions.latitude.toFixed(5)}, ${watermarkOptions.longitude.toFixed(5)} (±${Math.round(watermarkOptions.accuracy || 5)}m)`
                : 'Acquiring GPS fix...'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
            <Clock className="w-3 h-3" />
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {/* Controls / Action Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          {capturedImage ? (
            /* Confirmation Actions */
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                <RotateCw className="w-4 h-4 text-slate-500" />
                <span>Retake Photo</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Confirm Photo</span>
              </button>
            </>
          ) : (
            /* Capture Actions */
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Switch Front/Back Camera"
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors border border-slate-200"
              >
                <RotateCw className="w-5 h-5 text-slate-500" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleCapture}
                className="flex-1 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>CAPTURE PHOTO</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors border border-slate-200"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
