import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RotateCw, FlipHorizontal, Video } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const [devices, setDevices] = useState([]);
  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0);
  const [stream, setStream] = useState(null);
  const [mirrored, setMirrored] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize and list camera devices
  useEffect(() => {
    if (!isOpen) return;
    
    const getDevices = async () => {
      try {
        // Request camera permission first
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(t => t.stop()); // release lock immediately

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        setError('');
      } catch (err) {
        console.error("Camera list permissions failed:", err);
        setError("Camera permission denied or camera not found.");
      }
    };

    getDevices();
  }, [isOpen]);

  // Start stream when active device or modal status changes
  useEffect(() => {
    if (!isOpen || devices.length === 0) return;

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, devices, activeDeviceIdx]);

  const startCamera = async () => {
    stopCamera();
    
    const targetDevice = devices[activeDeviceIdx];
    const constraints = {
      video: {
        deviceId: targetDevice ? { exact: targetDevice.deviceId } : undefined,
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Error starting camera:", err);
      setError("Failed to open camera stream. Try another camera device.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    setActiveDeviceIdx((prev) => (prev + 1) % devices.length);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Match canvas dimensions to the video stream size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Apply mirroring to canvas draw if enabled
    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset translation matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const base64Photo = canvas.toDataURL('image/jpeg', 0.85);
    onCapture(base64Photo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-slate-850 border-b border-slate-850">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Video className="w-4 h-4 text-sky-400" />
            <span>Camera Viewfinder</span>
          </span>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative flex-grow bg-slate-950 flex items-center justify-center min-h-[300px] overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-xs text-rose-400 font-semibold space-y-1">
              <p>⚠️ {error}</p>
              <p className="text-[10px] text-slate-500 font-normal">Please check browser permission toggles or connect a camera hardware.</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover max-h-[50vh] ${mirrored ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Hidden Canvas for capture rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-850 flex items-center justify-around">
          {/* Mirror toggle */}
          <button
            onClick={() => setMirrored(!mirrored)}
            className={`p-3 rounded-full transition ${mirrored ? 'bg-sky-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            title="Mirror image"
            disabled={!!error}
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>

          {/* Capture Trigger */}
          <button
            onClick={capturePhoto}
            className="p-4.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-full transition shadow-lg shadow-sky-600/10 flex items-center justify-center transform active:scale-95"
            title="Take Photo"
            disabled={!!error}
          >
            <Camera className="w-7 h-7" />
          </button>

          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            disabled={devices.length < 2 || !!error}
            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition"
            title="Switch Camera (Front/Rear)"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
