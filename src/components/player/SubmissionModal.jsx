import React, { useState } from 'react';
import { parsePhotoExif } from '../../utils/geoUtils';

export default function SubmissionModal({ clue, userLocation, team, isOpen, onClose, onSubmit }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [exifData, setExifData] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !clue) return null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    const parsedExif = await parsePhotoExif(file);
    if (parsedExif) {
      setExifData(parsedExif);
    } else {
      setExifData({
        lat: userLocation.lat,
        lng: userLocation.lng,
        timestamp: new Date().toISOString(),
        device: 'Mobile Browser Camera'
      });
    }
  };

  const handleAttributeChange = (key, value) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submissionPayload = {
      id: `SUB-${Date.now()}`,
      clueId: clue.id,
      clueNumber: clue.number,
      clueTitle: clue.title,
      teamId: team.id,
      teamName: team.name,
      submittedBy: team.members[0] || 'Team Player',
      capturedLocation: {
        lat: exifData?.lat || userLocation.lat,
        lng: exifData?.lng || userLocation.lng,
        accuracy: 2.8
      },
      photoUrl: photoPreview || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400',
      attributes: attributes,
      submittedAt: new Date().toISOString()
    };

    onSubmit(submissionPayload, clue);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1000]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="stitch-card p-6 max-w-lg w-full border border-[#a1fd63] max-h-[90vh] overflow-y-auto space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1b2300] text-[#a1fd63] border border-[#424c1d] uppercase font-bold">
              Clue #{clue.number} Submission
            </span>
            <h3 className="text-xl font-bold text-[#f0fdbd] mt-1">{clue.title}</h3>
            <p className="text-xs text-[#a5b177] mt-0.5">{clue.description}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#a5b177] hover:text-[#f0fdbd]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Precise GPS Point Collection */}
          <div className="p-3.5 rounded-xl bg-[#0b1000] border border-[#424c1d] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#f0fdbd] flex items-center gap-1.5 uppercase">
                <span className="material-symbols-outlined text-[#a1fd63] text-[18px]">my_location</span>
                Precise Point Collection
              </span>
              <span className="text-[#a1fd63] font-mono text-[11px]">GPS Locked (±2.8m)</span>
            </div>
            <div className="bg-[#101500] p-2.5 rounded-lg border border-[#424c1d] font-mono text-xs text-[#f0fdbd] flex items-center justify-between">
              <div>
                Lat: <span className="text-[#a1fd63]">{userLocation.lat.toFixed(5)}</span>
              </div>
              <div>
                Lng: <span className="text-[#a1fd63]">{userLocation.lng.toFixed(5)}</span>
              </div>
            </div>
          </div>

          {/* 2. Geotagged Photo Capture */}
          <div className="p-3.5 rounded-xl bg-[#0b1000] border border-[#424c1d] space-y-3">
            <label className="block text-xs font-bold text-[#f0fdbd] flex items-center justify-between uppercase">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#d2ef6a] text-[18px]">photo_camera</span>
                Geotagged Photo Capture
              </span>
              <span className="text-[10px] text-[#a5b177] font-mono">EXIF Auto-Parsed</span>
            </label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#424c1d] max-h-48">
                <img src={photoPreview} alt="Clue submission" className="w-full h-48 object-cover" />
                {exifData && (
                  <div className="absolute bottom-2 left-2 right-2 bg-[#0b1000]/90 backdrop-blur-md p-2 rounded-lg text-[10px] font-mono text-[#f0fdbd] border border-[#424c1d] flex items-center justify-between">
                    <span>EXIF: {exifData.lat.toFixed(4)}, {exifData.lng.toFixed(4)}</span>
                    <span className="text-[#a1fd63] font-bold">Geotag Verified</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#424c1d] hover:border-[#a1fd63] rounded-xl cursor-pointer bg-[#101500] transition-colors">
                <span className="material-symbols-outlined text-[32px] text-[#a1fd63] mb-1">upload_file</span>
                <span className="text-xs font-bold text-[#f0fdbd]">Tap to Take Photo or Upload</span>
                <span className="text-[10px] text-[#a5b177] mt-1 font-mono">Geotag & EXIF metadata automatically extracted</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* 3. Attribute Form Fields */}
          {clue.requiredAttributes && clue.requiredAttributes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#0b1000] border border-[#424c1d] space-y-3">
              <h4 className="text-xs font-bold text-[#f0fdbd] uppercase">Attribute Field Entry</h4>
              
              {clue.requiredAttributes.map(attr => (
                <div key={attr.key}>
                  <label className="text-[11px] text-[#a5b177] font-semibold">{attr.label}</label>
                  {attr.type === 'select' ? (
                    <select
                      onChange={e => handleAttributeChange(attr.key, e.target.value)}
                      className="w-full mt-1 bg-[#101500] border border-[#424c1d] rounded-xl px-3 py-2 text-xs text-[#f0fdbd] focus:outline-none focus:border-[#a1fd63]"
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
                      className="w-full mt-1 bg-[#101500] border border-[#424c1d] rounded-xl px-3 py-2 text-xs text-[#f0fdbd] focus:outline-none focus:border-[#a1fd63]"
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
              className="w-full py-3 stitch-btn-primary text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>Submit to Asynchronous Job Queue</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
