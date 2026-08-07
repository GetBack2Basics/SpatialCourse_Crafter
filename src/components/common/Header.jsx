import React from 'react';

export default function Header({ activeTab, setActiveTab, logCount, toggleLogs, activeTeam }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-border-subtle">
      <div className="h-16 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin-desktop flex items-center justify-between">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-base cursor-pointer" onClick={() => setActiveTab('ADMIN')}>
          <span className="material-symbols-outlined text-primary text-[32px]">forest</span>
          <span className="font-headline-md text-headline-md text-primary tracking-tight">
            SpatialCourse <span className="font-normal opacity-70 text-on-surface">Crafter</span>
          </span>
        </div>

        {/* Navigation items from Stitch code.html */}
        <nav className="hidden lg:flex items-center gap-gutter">
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`transition-colors uppercase text-label-md ${
              activeTab === 'ADMIN' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Admin Planner
          </button>

          <button
            onClick={() => setActiveTab('PLAYER')}
            className={`transition-colors uppercase text-label-md ${
              activeTab === 'PLAYER' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Mobile Clue Runner
          </button>

          <button
            onClick={() => setActiveTab('SCORING')}
            className={`transition-colors uppercase text-label-md ${
              activeTab === 'SCORING' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            AI Leaderboard
          </button>

          <button
            onClick={toggleLogs}
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors uppercase flex items-center gap-1.5"
          >
            <span>WS Logs</span>
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-mono text-[10px]">
              {logCount}
            </span>
          </button>

          <div className="ml-4 border-l border-outline-variant pl-4 flex items-center gap-2">
            <img
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-outline-variant hover:ring-2 hover:ring-primary-container cursor-pointer transition-all"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBliQnnmsuu7aUUcnZ6koWP0IsPKO0poQ74gKymoXyA8qMQjgpzV1mGDLG__TTjLR9bjbfunm_OdsYB4YsG3EeYQknYubmpJ4x-gQVxoC5zt6i22YkF90jAUnorFp7f5PM315MNcl6YQ0k5kgpKIFbBs2sWGI8s55RPnpEUc-P4tlDUMtPARPo4uHXvUUh-wDGCGGoeZB7hgmDrC4IJjClCi7DOQQGBFeHsEV_DrdYJjE1S2wTUkq3S"
            />
            <span className="text-xs font-bold text-primary">{activeTeam?.name || 'Team Mango'}</span>
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={toggleLogs}
            className="p-2 rounded-full bg-surface-container border border-border-subtle text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">terminal</span>
          </button>
        </div>

      </div>
    </header>
  );
}
