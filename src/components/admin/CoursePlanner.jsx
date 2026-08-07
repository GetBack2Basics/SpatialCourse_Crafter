import React, { useState, useEffect } from 'react';
import MapLibreView from '../map/MapLibreView';
import { wsService } from '../../services/websocketService';

export default function CoursePlanner({
  course,
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateNewCourse,
  onUpdateCourse
}) {
  const [title, setTitle] = useState(course.title);
  const [duration, setDuration] = useState(course.durationMinutes);
  const [theme, setTheme] = useState(course.theme);
  const [startName, setStartName] = useState(course.startLocation.name);

  // Sync state whenever selected course changes
  useEffect(() => {
    setTitle(course.title);
    setDuration(course.durationMinutes);
    setTheme(course.theme);
    setStartName(course.startLocation.name);
  }, [course]);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState(null);

  // New clue modal state
  const [isAddingClue, setIsAddingClue] = useState(false);
  const [newClueTitle, setNewClueTitle] = useState('');
  const [newClueCategory, setNewClueCategory] = useState('WW2 Heritage & Boating');
  const [newClueDesc, setNewClueDesc] = useState('');
  const [newClueLat, setNewClueLat] = useState(course.startLocation.lat - 0.0012);
  const [newClueLng, setNewClueLng] = useState(course.startLocation.lng + 0.0015);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveCourse = async () => {
    const updatedCourse = {
      ...course,
      title,
      durationMinutes: parseInt(duration, 10),
      theme,
      startLocation: {
        ...course.startLocation,
        name: startName
      }
    };

    onUpdateCourse(updatedCourse);

    try {
      await fetch('http://localhost:8080/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCourse)
      });
    } catch (e) {
      console.warn("Backend save notice:", e.message);
    }

    wsService.emitLog('SYSTEM', `Course Published: "${title}" (${duration} mins, Theme: ${theme})`);
    showToast(`✅ Course "${title}" successfully saved & published!`);
  };

  const handleDiscardDraft = () => {
    setTitle(course.title);
    setDuration(course.durationMinutes);
    setTheme(course.theme);
    setStartName(course.startLocation.name);

    wsService.emitLog('SYSTEM', `Draft discarded for course "${course.title}". Reset to last saved state.`);
    showToast(`🔄 Draft discarded. Reset to last saved state.`, 'info');
  };

  const handleCreateClue = (e) => {
    e.preventDefault();
    if (!newClueTitle) return;

    const newClue = {
      id: `clue-${Date.now()}`,
      number: course.clues.length + 1,
      title: newClueTitle,
      category: newClueCategory,
      description: newClueDesc || 'Custom waypoint added in Rathmines NSW',
      targetLocation: { lat: parseFloat(newClueLat), lng: parseFloat(newClueLng) },
      points: 500,
      targetRadiusMeters: 25,
      taskType: 'PHOTO_VALIDATION',
      requiredAttributes: [
        { key: 'site_condition', label: 'Condition', type: 'select', options: ['Good', 'Fair', 'Requires Maint'] }
      ],
      aiCriteria: 'Verify photo matches waypoint feature at target location.'
    };

    const updatedClues = [...course.clues, newClue];
    onUpdateCourse({
      ...course,
      clues: updatedClues
    });

    wsService.emitLog('SYSTEM', `Added Waypoint #${newClue.number}: "${newClueTitle}" (${newClueCategory})`);
    showToast(`📍 Waypoint #${newClue.number} "${newClueTitle}" added successfully!`);

    setIsAddingClue(false);
    setNewClueTitle('');
    setNewClueDesc('');
  };

  return (
    <div className="flex flex-col w-full h-full relative" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl font-mono text-xs border transition-all animate-in fade-in duration-300 ${
          toastMessage.type === 'success'
            ? 'bg-primary-container text-on-primary-container border-primary'
            : 'bg-surface-container-high text-on-surface border-outline-variant'
        }`}>
          {toastMessage.text}
        </div>
      )}

      {/* Top actions bar with Course Selector & New Course controls */}
      <div className="w-full bg-surface-container-lowest shadow-sm z-10 px-margin-mobile lg:px-margin-desktop py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle">
        
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Spatial Olympics Course Wizard</h1>
          <p className="font-body-md text-body-md text-text-secondary mt-1">Design and configure geo-spatial challenges.</p>
        </div>

        {/* Course Selector & New Course Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container rounded-full px-3 py-1.5 border border-border-subtle shadow-sm">
            <span className="material-symbols-outlined text-primary text-sm">map</span>
            <select
              value={selectedCourseId}
              onChange={e => onSelectCourse(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onCreateNewCourse}
            className="h-9 px-4 rounded-full font-label-md text-xs bg-secondary-container text-on-secondary-container hover:bg-secondary/20 transition-all font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Course
          </button>

          <div className="w-px h-6 bg-border-subtle hidden sm:block mx-1"></div>

          <button
            onClick={handleDiscardDraft}
            className="h-9 px-4 rounded-full font-label-md text-xs bg-surface text-primary border border-primary transition-all hover:bg-primary-container hover:text-on-primary-container uppercase tracking-wide cursor-pointer"
          >
            Discard
          </button>
          
          <button
            onClick={handleSaveCourse}
            className="h-9 px-5 rounded-full font-label-md text-xs bg-primary text-on-primary shadow-md transition-all hover:bg-surface-tint hover:shadow-lg uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Save Course
          </button>
        </div>

      </div>

      {/* Main Content Area: Split Layout from Stitch code.html */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1440px] mx-auto overflow-hidden">
        
        {/* LEFT COLUMN: Course Parameters & Clues */}
        <div className="w-full lg:w-[45%] flex flex-col overflow-y-auto bg-surface relative z-10 custom-scrollbar pb-24 lg:pb-0">
          <div className="p-margin-mobile lg:p-margin-desktop space-y-12">
            
            {/* Section: Course Parameters */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">01</div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Course Parameters</h2>
              </div>
              <div className="space-y-6">
                <div className="relative group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Course Title</label>
                  <input
                    className="w-full bg-surface-container-lowest rounded-lg py-3 px-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="relative group flex-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Duration (mins)</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm font-mono"
                        type="number"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">timer</span>
                    </div>
                  </div>
                  <div className="relative group flex-1">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Start Location</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                        type="text"
                        value={startName}
                        onChange={e => setStartName(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">location_on</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Theme Selection */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">02</div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Location Theme</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Historical & Spatial', icon: 'history_edu', desc: 'Focus on historical progression across geographic zones.' },
                  { name: 'Cultural Heritage', icon: 'temple_buddhist', desc: 'Sites of profound cultural and societal impact.' },
                  { name: 'Eco & Environmental', icon: 'eco', desc: 'Natural reserves, topographies, and conservation zones.' },
                  { name: 'Geodetic Precision', icon: 'satellite_alt', desc: 'High-accuracy surveying marks and geospatial anchors.' }
                ].map(item => {
                  const isActive = theme === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setTheme(item.name)}
                      className={`text-left p-4 rounded-xl border transition-colors shadow-sm group relative overflow-hidden cursor-pointer ${
                        isActive
                          ? 'border-2 border-primary bg-primary/5'
                          : 'border-border-subtle bg-surface-container-lowest hover:bg-surface-container-low'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Active</div>
                      )}
                      <span className={`material-symbols-outlined mb-2 text-[28px] group-hover:scale-110 transition-transform ${isActive ? 'text-primary' : 'text-tertiary'}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {item.icon}
                      </span>
                      <h3 className={`font-label-md text-label-md mb-1 ${isActive ? 'text-primary' : 'text-on-surface'}`}>{item.name}</h3>
                      <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section: Course Clues */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">03</div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Course Clues</h2>
                </div>
                <button
                  onClick={() => setIsAddingClue(true)}
                  className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>

              <div className="space-y-4">
                {course.clues.map(clue => (
                  <div key={clue.id} className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-l-primary shadow-sm group hover:shadow-md transition-shadow relative">
                    <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm font-bold shadow-sm">
                      {clue.number}
                    </div>
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h4 className="font-label-md text-label-md text-on-surface">{clue.title}</h4>
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-label-sm font-bold">
                        {clue.points} PTS
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary pl-2 mb-3">{clue.description}</p>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{clue.category}</span>
                      <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono">
                        {clue.targetLocation.lat.toFixed(4)}° N, {clue.targetLocation.lng.toFixed(4)}° E
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Map Canvas */}
        <div className="w-full lg:w-[55%] h-[512px] lg:h-auto relative bg-surface-variant z-0 shadow-inner">
          <MapLibreView
            center={[course.startLocation.lng, course.startLocation.lat]}
            zoom={15}
            clues={course.clues}
          />

          {/* Floating Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
            <div className="bg-surface-container-lowest rounded-xl shadow-md p-1 flex flex-col">
              <button className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary rounded-lg transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <div className="w-6 h-px bg-border-subtle mx-auto my-1"></div>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary rounded-lg transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
            <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary transition-colors mt-2">
              <span className="material-symbols-outlined">my_location</span>
            </button>
            <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary transition-colors">
              <span className="material-symbols-outlined">layers</span>
            </button>
          </div>

          {/* Bottom Data Bar overlaying map */}
          <div className="absolute bottom-6 left-6 right-6 lg:right-auto lg:w-96 bg-surface/90 backdrop-blur-md rounded-xl p-4 shadow-xl border border-border-subtle z-20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Spatial Analysis</span>
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-mono text-[10px]">LIVE</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-secondary">Total Distance</span>
                <span className="font-mono text-on-surface">14.2 km</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-secondary">Est. Completion</span>
                <span className="font-mono text-on-surface">3h 45m</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full w-[65%]"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Add Clue Modal */}
      {isAddingClue && (
        <div className="fixed inset-0 z-50 bg-surface/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-primary max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-on-surface">Add New Spatial Clue (Rathmines)</h3>

            <form onSubmit={handleCreateClue} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Clue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Catalina Hangar Foundation"
                  value={newClueTitle}
                  onChange={e => setNewClueTitle(e.target.value)}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Category</label>
                <select
                  value={newClueCategory}
                  onChange={e => setNewClueCategory(e.target.value)}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                >
                  <option value="WW2 Heritage & Boating">WW2 Heritage & Boating</option>
                  <option value="Maritime & Boating">Maritime & Boating</option>
                  <option value="Historical GIS">Historical GIS</option>
                  <option value="Visual AI">Visual AI</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Description / Clue Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Clue instructions for participants..."
                  value={newClueDesc}
                  onChange={e => setNewClueDesc(e.target.value)}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newClueLat}
                    onChange={e => setNewClueLat(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newClueLng}
                    onChange={e => setNewClueLng(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingClue(false)}
                  className="px-4 py-2 rounded-full border border-border-subtle text-xs font-semibold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-primary text-on-primary font-bold text-xs uppercase shadow-md hover:bg-surface-tint cursor-pointer"
                >
                  Save Waypoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
