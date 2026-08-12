import React, { useState } from 'react';

export default function HelpModal({ isOpen, onClose }) {
  const [activeHelpTab, setActiveHelpTab] = useState('RUNNER');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-theme-main">
        {/* Header */}
        <div className="p-5 border-b border-theme flex items-center justify-between bg-theme-container/50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-theme-primary text-2xl">help</span>
            <div>
              <h2 className="text-lg font-bold">SpatialCourse Crafter - System Help & Guide</h2>
              <p className="text-xs text-theme-sub">Comprehensive user guide and feature reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-theme-sub hover:text-theme-main hover:bg-theme-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-theme bg-theme-surface px-4 overflow-x-auto text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveHelpTab('RUNNER')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeHelpTab === 'RUNNER'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
            }`}
          >
            <span className="material-symbols-outlined text-base">directions_run</span>
            Runner
          </button>

          <button
            onClick={() => setActiveHelpTab('LEADERBOARD')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeHelpTab === 'LEADERBOARD'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
            }`}
          >
            <span className="material-symbols-outlined text-base">leaderboard</span>
            Leaderboard
          </button>

          <button
            onClick={() => setActiveHelpTab('PLANNER')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeHelpTab === 'PLANNER'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
            }`}
          >
            <span className="material-symbols-outlined text-base">map</span>
            Course Manager
          </button>

          <button
            onClick={() => setActiveHelpTab('ISSUES')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeHelpTab === 'ISSUES'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
            }`}
          >
            <span className="material-symbols-outlined text-base">bug_report</span>
            Bugs
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {activeHelpTab === 'ISSUES' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">bug_report</span>
                <h3>Bugs, Issues & Feature Request Backlog Page</h3>
              </div>

              <p className="text-theme-sub">
                The Issue Tracker page allows users, developers, and field teams to log bugs, request new GIS features, submit performance optimizations, and upvote existing requests to influence development priority.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">edit_note</span>
                    Form Entry & Classification
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>Categories:</strong> Bug Report, Feature Request, Enhancement, UI/UX Update, Performance Issue.</li>
                    <li><strong>Severity:</strong> LOW, MEDIUM, HIGH, CRITICAL (System crash / data risk).</li>
                    <li><strong>Priority:</strong> P3_LOW, P2_MEDIUM, P1_HIGH, P0_BLOCKER (Must Fix Now).</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">filter_alt</span>
                    Search & Multi-Filtering
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>Live Search:</strong> Filter across title, description, reporter, and tags.</li>
                    <li><strong>Multi-Select Filters:</strong> Filter concurrently by Category, Severity, Priority, and Status.</li>
                    <li><strong>Upvoting & Sort:</strong> Upvote features/bugs and sort by Priority rank, Upvotes, or Date.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2 md:col-span-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">download</span>
                    Persistence & 1-Click Export
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Backlog items persist in local browser storage (`spatial_course_issue_backlog`) and can be exported at any time as a formatted JSON document via the <strong>Export JSON</strong> button.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'PLANNER' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">map</span>
                <h3>Admin Course Planner</h3>
              </div>
              <p className="text-theme-sub">
                Design interactive spatial challenges, set start/finish geofences, add waypoints with target radiuses, and run AI route optimizations directly on MapLibre 3D maps.
              </p>
            </div>
          )}

          {activeHelpTab === 'RUNNER' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">directions_run</span>
                <h3>Runner & Field Operations</h3>
              </div>
              <p className="text-theme-sub">
                Field app for mobile competitors. Captures real-time GPS coordinates, calculates distance & azimuth bearings to waypoints, records attribute data, and queues submissions offline.
              </p>
              <div className="space-y-2 text-xs text-theme-sub border-t border-theme/40 pt-3">
                <p>
                  <strong>Technical Resilience & Field Backup:</strong> Discrete controls on the runner map canvas allow teams to save a JSON progress snapshot or upload a JSON backup file to restore progress if hardware or network connection fails. Teams can also generate a print-optimized paper guide (with masked bounding box zones for hidden waypoints) to continue on paper.
                </p>
                <p>
                  Teams that proactively save progress backups as they advance through waypoints earn technical failure preparedness bonus points (+25 PTS base + 10 PTS per save) on the scoring leaderboard for anticipating tech failures.
                </p>
                <p>
                  <strong>Leaderboard Unlocking:</strong> Non-admin player access to the Leaderboard unlocks once your team completes all waypoints and locks your final submission.
                </p>
              </div>
            </div>
          )}

          {activeHelpTab === 'LEADERBOARD' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">leaderboard</span>
                <h3>Leaderboard & AI Scoring Engine</h3>
              </div>
              <p className="text-theme-sub">
                Live team standings scored with multi-factor weighting (Accuracy, Speed, Photo Proof, Attribute Precision) and prompt-driven AI Vibe Scoring.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme bg-theme-container/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-theme-primary text-black font-bold text-xs hover:opacity-90 transition-all shadow"
          >
            Got it, Close Help
          </button>
        </div>
      </div>
    </div>
  );
}
