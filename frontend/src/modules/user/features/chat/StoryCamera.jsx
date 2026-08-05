import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Zap, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export function StoryCamera({ onPost, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentDeviceIdx, setCurrentDeviceIdx] = useState(0);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async (mode = facingMode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Enumerate all available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoIns = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoIns);

      let constraints = { video: { facingMode: { ideal: mode } } };

      if (videoIns.length > 1) {
        let targetIdx = currentDeviceIdx;
        if (mode === 'environment') {
          // Identify back/rear camera labels
          const backIdx = videoIns.findIndex(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment') || 
            d.label.toLowerCase().includes('facing 0') ||
            d.label.toLowerCase().includes('camera 1')
          );
          targetIdx = backIdx !== -1 ? backIdx : 1;
        } else {
          // Identify front camera labels
          const frontIdx = videoIns.findIndex(d => 
            d.label.toLowerCase().includes('front') || 
            d.label.toLowerCase().includes('user') || 
            d.label.toLowerCase().includes('facing 1') ||
            d.label.toLowerCase().includes('camera 0')
          );
          targetIdx = frontIdx !== -1 ? frontIdx : 0;
        }
        
        setCurrentDeviceIdx(targetIdx);
        constraints = { 
          video: { 
            deviceId: { exact: videoIns[targetIdx].deviceId } 
          } 
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.log("Video auto play failed", e));
      }
      setCameraError(false);
    } catch (err) {
      console.error("Camera access error:", err);
      // Fallback to basic constraint matching if exact deviceId constraints fail
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode } } });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.log("Video auto play failed", e));
        }
        setCameraError(false);
      } catch (fallbackErr) {
        console.error("Fallback camera failure", fallbackErr);
        setCameraError(true);
      }
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);

    if (videoDevices.length > 1) {
      const nextIdx = (currentDeviceIdx + 1) % videoDevices.length;
      setCurrentDeviceIdx(nextIdx);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = { video: { deviceId: { exact: videoDevices[nextIdx].deviceId } } };
      navigator.mediaDevices.getUserMedia(constraints)
        .then(mediaStream => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(e => console.log("Video auto play failed", e));
          }
        })
        .catch(err => {
          console.error("Failed switching by deviceId, falling back to facingMode", err);
          startCamera(newMode);
        });
    } else {
      startCamera(newMode);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (flashOn) {
        // Simple flash effect simulation
        const flashOverlay = document.createElement('div');
        flashOverlay.className = "fixed inset-0 bg-white z-[70] opacity-100 transition-opacity duration-300";
        document.body.appendChild(flashOverlay);
        setTimeout(() => { flashOverlay.style.opacity = '0'; }, 50);
        setTimeout(() => { document.body.removeChild(flashOverlay); }, 350);
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      // Mirror the image if it's a front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      stopCamera();
    }
  };

  if (capturedImage) {
    return (
      <div className="fixed inset-0 z-[100] bg-black animate-in fade-in flex flex-col justify-between pb-8">
        <img src={capturedImage} className="w-full h-[90vh] object-cover rounded-b-3xl" alt="Preview" />
        
        {/* Top Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-4">
          <button 
            onClick={() => { setCapturedImage(null); startCamera(); }} 
            className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95 transition-transform"
          >
            <X size={24} />
          </button>
        </div>

        {/* Bottom Post Button */}
        <div className="absolute bottom-6 right-4 z-10 flex gap-4">
          <button 
            onClick={() => onPost(capturedImage)} 
            className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            Your Story <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in slide-in-from-bottom-full duration-300">
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent pt-6">
        <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={28} />
        </button>
        <button 
          onClick={() => setFlashOn(!flashOn)} 
          className={cn("p-2 rounded-full transition-colors", flashOn ? "text-accent-yellow bg-white/10" : "text-white hover:bg-white/10")}
        >
          <Zap size={24} className={flashOn ? "fill-accent-yellow" : ""} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 w-full relative bg-gray-900 rounded-b-3xl overflow-hidden mt-0">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-8 text-center bg-black">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <ImageIcon size={32} className="text-gray-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Camera Access Denied</h3>
            <p className="text-sm text-gray-400 mb-6">We need camera access to capture stories. Please use the gallery instead.</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-main text-white px-6 py-3 rounded-full font-bold shadow-sm"
            >
              Open Gallery
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={cn("w-full h-full object-cover", facingMode === 'user' && "transform -scale-x-100")} 
          ></video>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>

      {/* Bottom Controls */}
      <div className="h-40 bg-black flex items-center justify-between px-8 relative pb-4">
        {/* Gallery Upload */}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="w-12 h-12 rounded-full border border-white/30 overflow-hidden bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform"
        >
          <ImageIcon size={22} className="text-white" />
        </button>

        {/* Shutter Button */}
        <button 
          onClick={capturePhoto} 
          disabled={cameraError}
          className={cn("w-20 h-20 rounded-full border-4 flex items-center justify-center group outline-none", cameraError ? "border-gray-600 cursor-not-allowed" : "border-white")}
        >
          <div className={cn("w-16 h-16 rounded-full group-active:scale-95 transition-transform", cameraError ? "bg-gray-600" : "bg-white")}></div>
        </button>

        {/* Flip Camera */}
        <button 
          onClick={toggleCamera}
          className="w-12 h-12 rounded-full border border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <RefreshCw size={22} />
        </button>
      </div>
    </div>
  );
}
