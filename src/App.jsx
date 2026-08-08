import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import CoursePlanner from './components/admin/CoursePlanner';
import ClueRunner from './components/player/ClueRunner';
import Leaderboard from './components/scoring/Leaderboard';
import TerminalLogs from './components/common/TerminalLogs';

import { PRESET_COURSES } from './data/initialCourse';
import { wsService } from './services/websocketService';
import { teamMergeService } from './services/teamMergeService';

import AuthModal from './components/common/AuthModal';
import { authService } from './services/authService';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = (params.get('tab') || params.get('mode') || '').toUpperCase();
    if (['ADMIN', 'PLAYER', 'SCORING'].includes(tabParam)) {
      return tabParam;
    }
    if (['RUNNER', 'CLUE_RUNNER', 'FIELD', 'MOBILE'].includes(tabParam)) {
      return 'PLAYER';
    }
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

  // Submissions state synced with teamMergeService
  const [submissions, setSubmissions] = useState([]);

  // Authenticated User State & Modal State
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active team derived from auth state
  const activeTeam = { id: 'team-mango', name: 'Team Mango (NSW)', members: [currentUser?.email || 'Jordan', 'Taylor'] };

  useEffect(() => {
    // Connect to WebSocket server on mount
    wsService.connect('ws://localhost:8080/ws');

    const unsubscribeWs = wsService.subscribe((logItems) => {
      setLogs(logItems);
    });

    const unsubscribeMerge = teamMergeService.subscribe((subs) => {
      setSubmissions(subs);
    });

    const unsubscribeAuth = authService.subscribe(({ currentUser: user }) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribeWs();
      unsubscribeMerge();
      unsubscribeAuth();
    };
  }, []);

  const handleUpdateCourse = (updatedCourse) => {
    setCourses(prev => {
      const exists = prev.some(c => c.id === updatedCourse.id);
      if (exists) {
        return prev.map(c => c.id === updatedCourse.id ? updatedCourse : c);
      } else {
        return [...prev, updatedCourse];
      }
    });
    setSelectedCourseId(updatedCourse.id);
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
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
            submissions={submissions}
          />
        )}

        {activeTab === 'SCORING' && (
          <Leaderboard
            teams={[
              activeTeam,
              { id: 'team-wombat', name: 'Team Wombat (QLD)', members: ['Sarah', 'Ken'] },
              { id: 'team-koala', name: 'Team Koala (VIC)', members: ['Alex', 'Mina'] }
            ]}
            submissions={submissions}
            courseClues={activeCourse.clues}
            onSubmissionsValidated={() => {}}
          />
        )}
      </main>

      {/* Auth & RBAC Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
      />

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
