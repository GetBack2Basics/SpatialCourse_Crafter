import React, { useState, useRef } from 'react';
import { parsePhotoExif } from '../../utils/geoUtils';
import { queueService } from '../../services/queueService';
import { Camera, Image as ImageIcon, Upload, MapPin, CheckCircle2, AlertTriangle, FileText, X } from 'lucide-react';

export default function SubmissionModal({ clue, userLocation, team, isOpen, onClose, onSubmit, initialMode = 'GALLERY' }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [exifData, setExifData] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Gallery vs Camera upload mode
  const [uploadMode, setUploadMode] = useState(initialMode); // 'GALLERY' | 'CAMERA'
  
  // Location source: 'DEVICE_GPS' | 'EXIF' | 'TARGET'
  const [locationSource, setLocationSource] = useState('DEVICE_GPS');
  const [isDragOver, setIsDragOver] = useState(false);

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  if (!isOpen || !clue) return null;

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    const parsedExif = await parsePhotoExif(file);
    if (parsedExif && parsedExif.lat && parsedExif.lng) {
      setExifData(parsedExif);
      setLocationSource('EXIF'); // Automatically prefer EXIF coordinates from photo metadata if present
    } else {
      setExifData(null);
      if (locationSource === 'EXIF') {
        setLocationSource('DEVICE_GPS');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
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

  const [formError, setFormError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    const isGroupPhotoRequired = clue.requiresGroupPhoto !== false; // Default true per Spatial Olympics rules

    if (isGroupPhotoRequired && !photoPreview) {
      setFormError("⚠️ Mandatory Group Photo required! Please take or upload a photo showing all team members at this location.");
      return;
    }

    setIsSubmitting(true);

    const submissionPayload = {
      id: `SUB-${Date.now()}`,
      clueId: clue.id,
      clueNumber: clue.number,
      clueTitle: clue.title,
      teamId: team.id,
      teamName: team.name,
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
    if (onSubmit) onSubmit(submissionPayload, clue);

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-theme-surface/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 max-w-lg w-full border border-theme rounded-3xl max-h-[90vh] overflow-y-auto space-y-5 bg-theme-container text-theme-main shadow-2xl transition-colors duration-300">
        
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

          {/* 2. Photo Upload / Drop Zone */}
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
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => {
                  if (uploadMode === 'CAMERA') {
                    cameraInputRef.current?.click();
                  } else {
                    galleryInputRef.current?.click();
                  }
                }}
                className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 ${
                  isDragOver
                    ? 'border-theme-primary bg-theme-primary/10 scale-[0.99]'
                    : 'border-theme hover:border-theme-primary bg-theme-container-high/60 hover:bg-theme-container-high'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-theme-primary/15 text-theme-primary border border-theme flex items-center justify-center">
                  {uploadMode === 'CAMERA' ? <Camera className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>

                <div>
                  <div className="text-xs font-bold text-theme-main">
                    {uploadMode === 'CAMERA' ? 'Tap to Launch Phone Camera' : 'Click to Browse Gallery or Drag & Drop File'}
                  </div>
                  <div className="text-[11px] text-theme-sub mt-1 font-mono">
                    Supports JPG, PNG, HEIC from mobile photos or laptop disk
                  </div>
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-theme-surface text-theme-primary border border-theme text-[10px] font-mono font-semibold mt-1">
                  {uploadMode === 'CAMERA' ? '📷 Direct Camera Capture' : '🖼️ Gallery / Laptop Photo Picker'}
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
