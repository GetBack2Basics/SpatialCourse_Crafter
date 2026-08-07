import React, { useState, useEffect } from 'react';
import Header from './components/common/Header';
import TerminalLogs from './components/common/TerminalLogs';
import CoursePlanner from './components/admin/CoursePlanner';
import ClueRunner from './components/player/ClueRunner';
import Leaderboard from './components/scoring/Leaderboard';

import { DEFAULT_COURSE, INITIAL_TEAMS } from './data/initialCourse';
import { wsService } from './services/websocketService';
import { queueService } from './services/queueService';
import { teamMergeService } from './services/teamMergeService';

export default function App() {
  // Set DEFAULT activeTab to 'ADMIN' so the user immediately sees the Stitch Admin Planner!
  const [activeTab, setActiveTab] = useState('ADMIN'); // 'ADMIN' | 'PLAYER' | 'SCORING'
  const [course, setCourse] = useState(DEFAULT_COURSE);
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [activeTeam, setActiveTeam] = useState(INITIAL_TEAMS[0]);
  
  // WebSocket logs state
  const [logs, setLogs] = useState([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState([
    {
      id: 'sub-sample-1',
      clueId: 'clue-1',
      clueNumber: 1,
      clueTitle: 'Geodetic Survey Reference Mark #402',
      teamId: 'team-1',
      teamName: 'Team Mango Mapping',
      submittedBy: 'Sarah',
      capturedLocation: { lat: -16.91858, lng: 145.77812, accuracy: 2.1 },
      spatialOffsetMeters: 3.2,
      isWithinRadius: true,
      status: 'VERIFIED_BY_AI',
      photoUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400',
      attributes: { pin_condition: 'Good', stamped_id: 'PM-402-FNQ' },
      aiMetrics: { spatialAccuracyScore: 98, photoConfidence: 94, attributeScore: 100, overallAiRating: 97 }
    },
    {
      id: 'sub-sample-2',
      clueId: 'clue-2',
      clueNumber: 2,
      clueTitle: 'Historical Maritime Pioneer Monument',
      teamId: 'team-2',
      teamName: 'Team GeoWizards',
      submittedBy: 'Marcus',
      capturedLocation: { lat: -16.92024, lng: 145.77945, accuracy: 3.5 },
      spatialOffsetMeters: 4.5,
      isWithinRadius: true,
      status: 'VERIFIED_BY_AI',
      photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400',
      attributes: { inscription_year: '1895', material_type: 'Sandstone' },
      aiMetrics: { spatialAccuracyScore: 92, photoConfidence: 90, attributeScore: 95, overallAiRating: 92 }
    }
  ]);

  // Subscribe to WebSocket logs
  useEffect(() => {
    const unsubscribe = wsService.subscribe(newLogs => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  // Subscribe to Team Merged Submissions
  useEffect(() => {
    const unsubscribe = teamMergeService.subscribe(mergedSubs => {
      if (mergedSubs.length > 0) {
        setSubmissions(prev => {
          const map = new Map();
          [...prev, ...mergedSubs].forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        });
      }
    });
    return unsubscribe;
  }, []);

  // Handle mobile player submission
  const handleSubmitData = (submissionPayload, targetClue) => {
    queueService.enqueueSubmission(submissionPayload, targetClue);
    setIsLogsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      
      {/* Global Navigation Header matching Stitch admin_text.html */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logCount={logs.length}
        toggleLogs={() => setIsLogsOpen(!isLogsOpen)}
        activeTeam={activeTeam}
      />

      {/* Main Content Area starting below fixed header */}
      <main className="w-full pt-16 bg-background min-h-screen">
        {activeTab === 'ADMIN' && (
          <CoursePlanner
            course={course}
            onUpdateCourse={setCourse}
          />
        )}

        {activeTab === 'PLAYER' && (
          <div className="max-w-[1440px] mx-auto p-margin-mobile lg:p-margin-desktop">
            <ClueRunner
              course={course}
              activeTeam={activeTeam}
              submissions={submissions}
              onSubmitData={handleSubmitData}
            />
          </div>
        )}

        {activeTab === 'SCORING' && (
          <div className="max-w-[1440px] mx-auto p-margin-mobile lg:p-margin-desktop">
            <Leaderboard
              teams={teams}
              submissions={submissions}
              courseClues={course.clues}
              onSubmissionsValidated={(validatedList) => setSubmissions(validatedList)}
            />
          </div>
        )}
      </main>

      {/* Slide-Up WebSocket Iteration Console */}
      <TerminalLogs
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onClear={() => wsService.clear()}
      />

    </div>
  );
}
