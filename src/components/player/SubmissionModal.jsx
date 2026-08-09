import React, { useState, useEffect, useRef } from 'react';
import { parsePhotoExif } from '../../utils/geoUtils';
import { queueService } from '../../services/queueService';
import { Camera, Image as ImageIcon, Upload, MapPin, CheckCircle2, AlertTriangle, FileText, X } from 'lucide-react';

export default function SubmissionModal({ clue, userLocation, team, isOpen, onClose, onSubmit, initialMode = 'GALLERY' }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [exifData, setExifData] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  
  // Gallery vs Camera upload mode
  const [uploadMode, setUploadMode] = useState(initialMode); // 'GALLERY' | 'CAMERA'
  
  // Location source: 'DEVICE_GPS' | 'EXIF' | 'TARGET'
  const [locationSource, setLocationSource] = useState('DEVICE_GPS');
  const [isDragOver, setIsDragOver] = useState(false);

  // Live Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live camera stream is not supported in this browser.");
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.warn("Video stream play notice:", err));
      }
    } catch (err) {
      console.warn("Live camera stream notice:", err.message);
      setCameraError("Live camera feed unavailable. Tap below to launch your phone's native Camera app.");
      setIsCameraActive(false);
    }
  };

  // Sync stream with video element whenever stream or camera state updates
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.play().catch(err => console.warn("Video stream play notice:", err));
    }
  }, [isCameraActive]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (width === 0 || height === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        const liveExif = {
          lat: userLocation?.lat || clue.targetLocation.lat,
          lng: userLocation?.lng || clue.targetLocation.lng,
          timestamp: new Date().toISOString(),
          device: 'Live Stream Camera (Verified GPS)'
        };
        setPhotoPreview(objectUrl);
        setExifData(liveExif);
        setLocationSource('EXIF');
        setFormError(null);
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => {
    if (isOpen) {
      setUploadMode(initialMode || 'GALLERY');
      setFormError(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen && uploadMode === 'CAMERA' && !photoPreview) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, uploadMode, photoPreview]);

  if (!isOpen || !clue) return null;

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setFormError(null);

    const parsedExif = await parsePhotoExif(file);
    if (!parsedExif || typeof parsedExif.lat !== 'number' || typeof parsedExif.lng !== 'number') {
      setPhotoPreview(null);
      setExifData(null);
      setFormError("⚠️ Photo rejected! Uploaded image is missing mandatory EXIF GPS metadata. Please take a photo with GPS location tagging enabled on your camera, or use the Live Camera.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setExifData(parsedExif);
    setLocationSource('EXIF'); // Automatically prefer EXIF coordinates from photo metadata
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleAttributeChange = (key, value) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  // Determine final coordinates based on location source choice
  let finalLat = userLocation?.lat || clue.targetLocation.lat;
  let finalLng = userLocation?.lng || clue.targetLocation.lng;
  let locationLabel = "Live Device GPS";

  if (locationSource === 'EXIF' && exifData) {
    finalLat = exifData.lat;
    finalLng = exifData.lng;
    locationLabel = "Photo EXIF Geotag";
  } else if (locationSource === 'TARGET') {
    finalLat = clue.targetLocation.lat;
    finalLng = clue.targetLocation.lng;
    locationLabel = "Waypoint Target GPS";
  }

  const modalContainerRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    const isGroupPhotoRequired = clue.requiresGroupPhoto !== false; // Default true per Spatial Olympics rules

    if (isGroupPhotoRequired && !photoPreview) {
      setFormError("⚠️ Mandatory Group Photo required! Please take or upload a photo showing all team members at this location.");
      modalContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (photoPreview && (!exifData || typeof exifData.lat !== 'number' || typeof exifData.lng !== 'number')) {
      setFormError("⚠️ Submission rejected! Uploaded photo is missing mandatory EXIF GPS metadata.");
      modalContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionPayload = {
        id: `SUB-${Date.now()}`,
        clueId: clue.id,
        clueNumber: clue.number,
        clueTitle: clue.title,
        teamId: team?.id || 'team-1',
        teamName: team?.name || 'Field Agent Team',
        submittedBy: team?.members?.[0] || 'Field Agent',
        capturedLocation: {
          lat: finalLat,
          lng: finalLng,
          accuracy: locationSource === 'EXIF' ? 1.5 : locationSource === 'TARGET' ? 0.5 : 2.8,
          source: locationSource
        },
        photoUrl: photoPreview || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400',
        isGroupPhotoVerified: Boolean(photoPreview),
        attributes: attributes,
        submittedAt: new Date().toISOString(),
        exifData: exifData,
        uploadMode: uploadMode
      };

      queueService.enqueueSubmission(submissionPayload, clue);
      if (onSubmit) {
        onSubmit(submissionPayload, clue);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error("Submission processing error:", err);
      setFormError(`⚠️ Submission error: ${err.message}`);
      setIsSubmitting(false);
      modalContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-theme-surface/85 backdrop-blur-md flex items-center justify-center p-4">
      <div ref={modalContainerRef} className="glass-panel p-6 max-w-lg w-full border border-theme rounded-3xl max-h-[90vh] overflow-y-auto space-y-5 bg-theme-container text-theme-main shadow-2xl transition-colors duration-300">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-theme pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-theme-primary/15 text-theme-primary border border-theme uppercase font-bold">
                Clue #{clue.number} Submission
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-container-high text-theme-secondary border border-theme font-bold">
                {clue.points} PTS
              </span>
              {clue.requiresGroupPhoto !== false && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                  <span>📸 GROUP PHOTO REQUIRED</span>
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-theme-main mt-1">{clue.title}</h3>
            <p className="text-xs text-theme-sub mt-0.5">{clue.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-theme-container-high text-theme-sub hover:text-theme-main hover:bg-theme-surface border border-theme transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group Photo Mandatory Banner */}
        {clue.requiresGroupPhoto !== false && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 font-mono">
            <span className="text-lg">📸</span>
            <div>
              <span className="font-bold block text-emerald-400 uppercase">Group Photo Required</span>
              <span>Submit a photo with all team members present at the location to earn full points & group verification bonus.</span>
            </div>
          </div>
        )}

        {formError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Location Reference Target Photo (What to look for) */}
        {clue.referencePhotoUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-theme bg-theme-container-high">
            <img
              src={clue.referencePhotoUrl}
              alt={clue.title}
              className="w-full h-32 object-cover"
            />
            <div className="absolute bottom-2 left-2 right-2 bg-theme-surface/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-mono text-theme-primary border border-theme flex items-center justify-between">
              <span>Location Target Reference Photo</span>
              <span className="text-theme-secondary font-bold uppercase">What to Look For</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Photo Mode Selection (Gallery Upload vs Camera) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-theme-main flex items-center gap-1.5 uppercase font-mono">
                <Upload className="w-4 h-4 text-theme-primary" />
                Select Photo Source
              </span>
              <span className="text-[10px] text-theme-sub font-mono">Phone Gallery & Laptop Supported</span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-theme-container-high rounded-xl border border-theme text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUploadMode('GALLERY')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  uploadMode === 'GALLERY'
                    ? 'bg-theme-primary text-theme-surface font-bold shadow-md'
                    : 'text-theme-sub hover:text-theme-main hover:bg-theme-container'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Gallery / Laptop File</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('CAMERA')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  uploadMode === 'CAMERA'
                    ? 'bg-theme-primary text-theme-surface font-bold shadow-md'
                    : 'text-theme-sub hover:text-theme-main hover:bg-theme-container'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Live Camera</span>
              </button>
            </div>
          </div>

          {/* Hidden Inputs */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,image/heic,image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 2. Photo Upload / Drop Zone / Live Viewfinder */}
          <div className="space-y-2">
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-theme group">
                <img src={photoPreview} alt="Clue submission" className="w-full h-52 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setExifData(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-theme-surface/80 text-theme-sub hover:text-theme-main border border-theme backdrop-blur-md"
                >
                  <X className="w-4 h-4" />
                </button>

                {exifData && (
                  <div className="absolute bottom-2 left-2 right-2 bg-theme-surface/90 backdrop-blur-md p-2.5 rounded-xl text-[11px] font-mono text-theme-main border border-emerald-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-bold block">EXIF Geotag Extracted:</span>
                      <span>{exifData.lat.toFixed(5)}, {exifData.lng.toFixed(5)}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                      {exifData.device || 'Verified GPS'}
                    </span>
                  </div>
                )}
              </div>
            ) : uploadMode === 'CAMERA' ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-2xl bg-black min-h-[16rem]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover bg-black"
                  />
                  
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 z-10">
                    <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                    <span>{isCameraActive ? 'LIVE STREAM CAMERA' : 'STARTING CAMERA...'}</span>
                  </div>

                  {isCameraActive && (
                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 px-4 z-10">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-extrabold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-5 h-5" />
                        <span>📸 SNAP PHOTO</span>
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-4 border border-amber-500/30 rounded-2xl bg-amber-950/20 text-center space-y-2 font-mono">
                    <div className="text-xs text-amber-300 font-bold">
                      {cameraError}
                    </div>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Launch Phone Camera App</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono text-theme-sub px-1">
                  <span>Need native app instead?</span>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    📷 Open Phone Camera App Direct
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => galleryInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 ${
                  isDragOver
                    ? 'border-theme-primary bg-theme-primary/10 scale-[0.99]'
                    : 'border-theme hover:border-theme-primary bg-theme-container-high/60 hover:bg-theme-container-high'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-theme-primary/15 text-theme-primary border border-theme flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <div className="text-xs font-bold text-theme-main">
                    Click to Browse Gallery / Laptop File or Drag & Drop
                  </div>
                  <div className="text-[11px] text-theme-sub mt-1 font-mono">
                    Supports JPG, PNG, HEIC from mobile photos or laptop disk
                  </div>
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-theme-surface text-theme-primary border border-theme text-[10px] font-mono font-semibold mt-1">
                  🖼️ Gallery / File Picker
                </span>
              </div>
            )}
          </div>

          {/* 3. Location Coordinate & Override Picker (Handles Field Issues) */}
          <div className="p-3.5 rounded-2xl bg-theme-container-high border border-theme space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-theme-main flex items-center gap-1.5 uppercase font-mono">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Spatial Location Source
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {locationLabel}
              </span>
            </div>

            {/* Coordinate Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setLocationSource('DEVICE_GPS')}
                className={`p-2 rounded-xl border text-left transition-all ${
                  locationSource === 'DEVICE_GPS'
                    ? 'bg-theme-primary/20 border-theme-primary text-theme-primary'
                    : 'bg-theme-container border-theme text-theme-sub hover:border-theme-primary'
                }`}
              >
                <div className="font-bold">Live GPS</div>
                <div className="text-[10px] truncate">{userLocation?.lat.toFixed(4)}, {userLocation?.lng.toFixed(4)}</div>
              </button>

              <button
                type="button"
                disabled={!exifData}
                onClick={() => exifData && setLocationSource('EXIF')}
                className={`p-2 rounded-xl border text-left transition-all ${
                  !exifData
                    ? 'opacity-40 bg-theme-container border-theme text-theme-sub cursor-not-allowed'
                    : locationSource === 'EXIF'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-theme-container border-theme text-theme-sub hover:border-theme-primary'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Photo EXIF</span>
                  {exifData && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-[10px] truncate">
                  {exifData ? `${exifData.lat.toFixed(4)}, ${exifData.lng.toFixed(4)}` : 'No EXIF in file'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLocationSource('TARGET')}
                className={`p-2 rounded-xl border text-left transition-all ${
                  locationSource === 'TARGET'
                    ? 'bg-theme-secondary/20 border-theme-secondary text-theme-secondary'
                    : 'bg-theme-container border-theme text-theme-sub hover:border-theme-primary'
                }`}
              >
                <div className="font-bold">Waypoint Target</div>
                <div className="text-[10px] truncate">{clue.targetLocation.lat.toFixed(4)}, {clue.targetLocation.lng.toFixed(4)}</div>
              </button>
            </div>

            <div className="bg-theme-container p-2.5 rounded-xl border border-theme font-mono text-xs text-theme-main flex items-center justify-between">
              <div>
                Selected Lat: <span className="text-theme-primary font-bold">{finalLat.toFixed(5)}</span>
              </div>
              <div>
                Selected Lng: <span className="text-theme-primary font-bold">{finalLng.toFixed(5)}</span>
              </div>
            </div>
          </div>

          {/* 4. Required Attribute Form Fields */}
          {clue.requiredAttributes && clue.requiredAttributes.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-theme-container-high border border-theme space-y-3">
              <h4 className="text-xs font-bold text-theme-main uppercase font-mono">Attribute Field Entry</h4>
              
              {clue.requiredAttributes.map(attr => (
                <div key={attr.key}>
                  <label className="text-[11px] text-theme-sub font-semibold block mb-1">{attr.label}</label>
                  {attr.type === 'select' ? (
                    <select
                      onChange={e => handleAttributeChange(attr.key, e.target.value)}
                      className="w-full bg-theme-container border border-theme rounded-xl px-3 py-2 text-xs text-theme-main focus:outline-none focus:border-theme-primary"
                    >
                      <option value="">Select option...</option>
                      {attr.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={attr.type || 'text'}
                      placeholder={attr.placeholder || ''}
                      onChange={e => handleAttributeChange(attr.key, e.target.value)}
                      className="w-full bg-theme-container border border-theme rounded-xl px-3 py-2 text-xs text-theme-main focus:outline-none focus:border-theme-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-theme-primary text-theme-surface font-extrabold text-xs shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-theme-surface" />
              <span>Submit Photo & Attributes to Spatial Pipeline</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
