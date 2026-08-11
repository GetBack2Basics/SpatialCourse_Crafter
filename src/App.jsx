import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import CoursePlanner from './components/admin/CoursePlanner';
import ClueRunner from './components/player/ClueRunner';
import Leaderboard from './components/scoring/Leaderboard';
import IssueTrackerPage from './components/admin/IssueTrackerPage';
import HelpModal from './components/common/HelpModal';
import { offlineStorage } from './services/offlineStorage';
import TerminalLogs from './components/common/TerminalLogs';

import { PRESET_COURSES } from './data/initialCourse';
import { wsService } from './services/websocketService';
import { teamMergeService } from './services/teamMergeService';
import { themeService } from './services/themeService';

import AuthModal from './components/common/AuthModal';
import { authService } from './services/authService';


export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = (params.get('tab') || params.get('mode') || '').toUpperCase();
    if (['ADMIN', 'PLAYER', 'SCORING', 'ISSUES'].includes(tabParam)) {
      return tabParam;
    }
    if (['BUG', 'BUGS', 'TRACKER', 'BACKLOG'].includes(tabParam)) {
      return 'ISSUES';
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
  
  // Help Modal State
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  // List of all courses available
  const [courses, setCourses] = useState(PRESET_COURSES);
  const [selectedCourseId, setSelectedCourseId] = useState(PRESET_COURSES[0].id);

  // Active course derived from selected ID
  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // Logs overlay state
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  // Submissions state synced with teamMergeService (Cloud)
  const [submissions, setSubmissions] = useState([]);
  
  // Local submissions synced with offlineStorage (Device-first)
  const [localSubmissions, setLocalSubmissions] = useState([]);

  useEffect(() => {
    offlineStorage.getPendingSubmissions().then(subs => setLocalSubmissions(subs));
  }, []);

  const handleSyncToCloud = async () => {
    if (localSubmissions.length === 0) return;
    try {
      const res = await fetch('/api/submissions/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions: localSubmissions })
      });
      if (res.ok) {
        await offlineStorage.clearPendingSubmissions();
        setLocalSubmissions([]);
        wsService.emitLog('SYSTEM', 'Successfully synced local submissions to cloud.');
        teamMergeService.fetchCloudSubmissions(); // Force immediate refresh
      }
    } catch (e) {
      console.warn('Failed to sync to cloud', e);
      wsService.emitLog('ERROR', 'Cloud sync failed. Submissions remain saved locally.');
    }
  };

  // Authenticated User State & Modal State
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !authService.getCurrentUser());
  const [realTeams, setRealTeams] = useState(() => authService.teams);

  // Active team derived from auth state
  const activeTeam = { id: 'team-george-will', name: 'Far North GIS (George & Will)', members: ['coreagc@gmail.com', 'william.dean@fungis.org'] };

  const handleDeleteCourse = (courseIdToDelete) => {
    setCourses(prev => {
      const filtered = prev.filter(c => c.id !== courseIdToDelete);
      if (filtered.length > 0) {
        setSelectedCourseId(filtered[0].id);
        return filtered;
      }
      return prev;
    });
    wsService.emitLog('SYSTEM', `Admin deleted course ID: ${courseIdToDelete}`);
  };

  useEffect(() => {
    // Prompt sign in if user is not authenticated on load
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }

    // Apply initial theme from themeService
    themeService.applyTheme();

    // Connect to WebSocket server on mount
    wsService.connect(); // URL derived dynamically from window.location via Vite proxy

    const unsubscribeWs = wsService.subscribe((logItems) => {
      setLogs(logItems);
    });

    const unsubscribeMerge = teamMergeService.subscribe((subs) => {
      setSubmissions(subs);
    });

    const unsubscribeAuth = authService.subscribe(({ currentUser: user, teams }) => {
      setCurrentUser(user);
      if (!user) setIsAuthModalOpen(true);
      if (teams) setRealTeams(teams);
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
    <div className="min-h-screen bg-theme-surface text-theme-main transition-colors duration-300 font-body-md relative overflow-x-hidden">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        logCount={logs.length}
        toggleLogs={() => setShowLogs(!showLogs)}
        activeTeam={activeTeam}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
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
            onDeleteCourse={handleDeleteCourse}
          />
        )}

        {activeTab === 'PLAYER' && (
          <ClueRunner
            course={activeCourse}
            activeTeam={activeTeam}
            submissions={[...submissions, ...localSubmissions]}
            onSubmitData={(submissionPayload) => {
              offlineStorage.saveSubmission(submissionPayload).then(() => {
                setLocalSubmissions(prev => [...prev, submissionPayload]);
              });
            }}
            pendingSyncCount={localSubmissions.length}
            onSyncToCloud={handleSyncToCloud}
          />
        )}

        {activeTab === 'SCORING' && (
          <Leaderboard
            teams={realTeams}
            submissions={[...submissions, ...localSubmissions]}
            courseClues={activeCourse.clues}
            onSubmissionsValidated={(validated) => {
              // Merge AI-enriched metrics back into cloud submissions state
              setSubmissions(prev => {
                const updatedIds = new Set(validated.map(v => v.id));
                const unchanged = prev.filter(s => !updatedIds.has(s.id));
                return [...unchanged, ...validated];
              });
              setShowLogs(true); // auto-open terminal so user can see AI progress
              wsService.emitLog('SUCCESS', `AI Validation complete: ${validated.length} submission(s) scored.`);
            }}
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            activeCourse={activeCourse}
            onValidationStart={() => setShowLogs(true)}
          />
        )}

        {activeTab === 'ISSUES' && (
          <IssueTrackerPage />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth & RBAC Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
      />

      {/* App Help & System Guide Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
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
