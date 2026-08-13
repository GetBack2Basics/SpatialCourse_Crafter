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
  // Authenticated User State & Modal State
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !authService.getCurrentUser());
  const [realTeams, setRealTeams] = useState(() => authService.teams);

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
    // If selecting ADMIN or SCORING and user is not logged in / not admin, show AuthModal
    if ((newTab === 'ADMIN' || newTab === 'SCORING') && (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN'))) {
      setIsAuthModalOpen(true);
    }
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

  // Sync progress overlay state
  const [syncStatus, setSyncStatus] = useState(null);

  const handleSyncToCloud = async () => {
    if (localSubmissions.length === 0) {
      setSyncStatus({ isSyncing: false, progress: 100, total: 0, message: '✅ All sites and submission data are fully synced!' });
      setTimeout(() => setSyncStatus(null), 4000);
      return;
    }

    const total = localSubmissions.length;
    setSyncStatus({ isSyncing: true, progress: 10, total, message: `Syncing site submission 1 of ${total} (10%)...` });

    try {
      for (let i = 1; i <= total; i++) {
        const pct = Math.round((i / total) * 100);
        setSyncStatus({ isSyncing: true, progress: pct, total, message: `Uploading site submission ${i} of ${total} (${pct}%)...` });
        await new Promise(r => setTimeout(r, 400));
      }

      const res = await fetch('/api/submissions/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions: localSubmissions })
      });

      if (res.ok) {
        await offlineStorage.clearPendingSubmissions();
        setLocalSubmissions([]);
        wsService.emitLog('SYSTEM', `Successfully synced ${total} local submission(s) to cloud.`);
        teamMergeService.fetchCloudSubmissions(); // Force immediate refresh
        setSyncStatus({ isSyncing: false, progress: 100, total, message: `🎉 Successfully uploaded ${total} site submission(s) to cloud! (100%)` });
        setTimeout(() => setSyncStatus(null), 4000);
      } else {
        throw new Error('Sync API response failed');
      }
    } catch (e) {
      console.warn('Failed to sync to cloud', e);
      wsService.emitLog('ERROR', 'Cloud sync failed. Submissions remain saved locally.');
      setSyncStatus({ isSyncing: false, progress: 0, total, message: '⚠️ Cloud sync offline. Submissions safely saved locally.' });
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // Active team derived dynamically from authenticated user session & cloud state
  const activeTeam = authService.currentUser
    ? authService.teams.find(t => (t.members || []).some(m => m.toLowerCase() === authService.currentUser.email.toLowerCase())) || authService.teams[0] || null
    : (authService.teams[0] || null);

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
    <div className="min-h-screen flex flex-col bg-theme-surface text-theme-main transition-colors duration-300 font-body-md relative overflow-x-hidden">
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
      <main className="w-full pt-16 flex-1 flex flex-col">
        {activeTab === 'ADMIN' && (
          currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' ? (
            <CoursePlanner
              course={activeCourse}
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              onCreateNewCourse={handleCreateNewCourse}
              onUpdateCourse={handleUpdateCourse}
              onDeleteCourse={handleDeleteCourse}
            />
          ) : (
            <div className="max-w-2xl mx-auto my-12 p-8 bg-surface-container rounded-2xl border border-border-subtle shadow-2xl text-center space-y-4">
              <span className="material-symbols-outlined text-5xl text-amber-400">admin_panel_settings</span>
              <h2 className="text-2xl font-bold text-on-surface">Course Manager Admin Restricted</h2>
              <p className="text-sm text-text-secondary">
                Course creation and waypoint planning are restricted to registered GIS Administrators and Event Coordinators.
              </p>
              <button
                onClick={() => setActiveTab('PLAYER')}
                className="mt-4 bg-primary text-on-primary font-bold py-2.5 px-6 rounded-xl hover:bg-primary-hover transition-colors"
              >
                Go to Runner
              </button>
            </div>
          )
        )}

        {activeTab === 'PLAYER' && (
          <ClueRunner
            course={activeCourse}
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            activeTeam={activeTeam}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
              setSubmissions(prev => {
                const updatedIds = new Set(validated.map(v => v.id));
                const unchanged = prev.filter(s => !updatedIds.has(s.id));
                return [...unchanged, ...validated];
              });
              setShowLogs(true);
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

      {/* Cloud Sync Progress Toast Banner */}
      {syncStatus && (
        <div className="fixed bottom-16 right-4 z-50 bg-slate-950/95 border border-cyan-400/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300 font-mono text-xs text-white">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-base ${syncStatus.isSyncing ? 'animate-spin' : ''}`}>
                {syncStatus.isSyncing ? 'sync' : 'cloud_done'}
              </span>
              <span>Site Sync Progress</span>
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-800">
              {syncStatus.progress}%
            </span>
          </div>

          <p className="text-slate-200 font-medium mb-2">{syncStatus.message}</p>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${syncStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />

      {/* Auth & RBAC Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        courses={courses}
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
