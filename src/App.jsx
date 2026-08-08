import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import CoursePlanner from './components/admin/CoursePlanner';
import ClueRunner from './components/player/ClueRunner';
import Leaderboard from './components/scoring/Leaderboard';
import TerminalLogs from './components/common/TerminalLogs';

import { PRESET_COURSES } from './data/initialCourse';
import { wsService } from './services/websocketService';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL search parameters or hash for explicit tab
    const params = new URLSearchParams(window.location.search);
    const tabParam = (params.get('tab') || params.get('mode') || '').toUpperCase();
    if (['ADMIN', 'PLAYER', 'SCORING'].includes(tabParam)) {
      return tabParam;
    }
    if (['RUNNER', 'CLUE_RUNNER', 'FIELD', 'MOBILE'].includes(tabParam)) {
      return 'PLAYER';
    }
    // If accessed on a mobile phone viewport (screen width < 768px), default to Mobile Clue Runner ('PLAYER')
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'PLAYER';
    }
    return 'ADMIN';
  });

  const handleTabSelect = (newTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', url.toString());
    }
  };
  
  // List of all courses available
  const [courses, setCourses] = useState(PRESET_COURSES);
  const [selectedCourseId, setSelectedCourseId] = useState(PRESET_COURSES[0].id);

  // Active course derived from selected ID
  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // Logs overlay state
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  // Active player team
  const [activeTeam] = useState({ id: 'team-mango', name: 'Team Mango (NSW)' });

  useEffect(() => {
    // Connect to WebSocket server on mount
    wsService.connect('ws://localhost:8080/ws');

    const unsubscribe = wsService.subscribe((logItems) => {
      setLogs(logItems);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleUpdateCourse = (updatedCourse) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  const handleCreateNewCourse = () => {
    const newId = `course-${Date.now()}`;
    const newCourse = {
      id: newId,
      title: "New Custom Spatial Challenge",
      subtitle: "Custom spatial olympics course created in Rathmines / Lake Macquarie",
      durationMinutes: 60,
      theme: "Historical & Spatial",
      startLocation: {
        name: "Rathmines Park, NSW 2283",
        lat: -33.0360,
        lng: 151.5930
      },
      clues: [
        {
          id: `clue-${Date.now()}-1`,
          number: 1,
          title: "Starting Waypoint",
          category: "Geospatial",
          description: "Initial waypoint for the spatial challenge.",
          targetLocation: { lat: -33.0360, lng: 151.5930 },
          points: 500,
          targetRadiusMeters: 25,
          taskType: "POINT_CAPTURE",
          requiredAttributes: [
            { key: "status", label: "Status", type: "select", options: ["Good", "Needs Inspection"] }
          ],
          aiCriteria: "Verify location photo at target coordinates."
        }
      ]
    };

    setCourses(prev => [newCourse, ...prev]);
    setSelectedCourseId(newId);
    wsService.emitLog('SYSTEM', `Created new course draft: "${newCourse.title}"`);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md relative overflow-x-hidden">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        logCount={logs.length}
        toggleLogs={() => setShowLogs(!showLogs)}
        activeTeam={activeTeam}
      />

      {/* Main Tab Content */}
      <main className="w-full pt-16 pb-20 lg:pb-0 min-h-[calc(100vh-4rem)]">
        {activeTab === 'ADMIN' && (
          <CoursePlanner
            course={activeCourse}
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            onCreateNewCourse={handleCreateNewCourse}
            onUpdateCourse={handleUpdateCourse}
          />
        )}

        {activeTab === 'PLAYER' && (
          <ClueRunner
            course={activeCourse}
            activeTeam={activeTeam}
          />
        )}

        {activeTab === 'SCORING' && (
          <Leaderboard
            course={activeCourse}
            activeTeam={activeTeam}
          />
        )}
      </main>

      {/* WebSocket Logs Terminal Drawer */}
      {showLogs && (
        <TerminalLogs
          isOpen={showLogs}
          logs={logs}
          onClose={() => setShowLogs(false)}
          onClear={() => wsService.clear()}
        />
      )}
    </div>
  );
}
