import React, { useState } from 'react';

export default function Header({ activeTab, setActiveTab, logCount, toggleLogs, activeTeam, currentUser, onOpenAuthModal }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSuperAdmin = currentUser && currentUser.email?.toLowerCase() === 'coreagc@gmail.com';
  const isAdmin = isSuperAdmin || (currentUser && currentUser.role === 'ADMIN');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-border-subtle">
        <div className="h-16 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin-desktop flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-base cursor-pointer" onClick={() => handleTabChange('ADMIN')}>
            <span className="material-symbols-outlined text-primary text-[32px]">forest</span>
            <span className="font-headline-md text-headline-md text-primary tracking-tight">
              SpatialCourse <span className="font-normal opacity-70 text-on-surface">Crafter</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-gutter">
            <button
              onClick={() => handleTabChange('ADMIN')}
              className={`transition-colors uppercase text-label-md ${
                activeTab === 'ADMIN' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Admin Planner
            </button>

            <button
              onClick={() => handleTabChange('PLAYER')}
              className={`transition-colors uppercase text-label-md flex items-center gap-1.5 ${
                activeTab === 'PLAYER' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Mobile Clue Runner</span>
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">FIELD</span>
            </button>

            <button
              onClick={() => handleTabChange('SCORING')}
              className={`transition-colors uppercase text-label-md ${
                activeTab === 'SCORING' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Leaderboard
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

            <div
              onClick={onOpenAuthModal}
              className="ml-4 border-l border-outline-variant pl-4 flex items-center gap-2 cursor-pointer group"
              title="Click to manage account auth & team roles"
            >
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-outline-variant group-hover:ring-2 group-hover:ring-primary transition-all"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBliQnnmsuu7aUUcnZ6koWP0IsPKO0poQ74gKymoXyA8qMQjgpzV1mGDLG__TTjLR9bjbfunm_OdsYB4YsG3EeYQknYubmpJ4x-gQVxoC5zt6i22YkF90jAUnorFp7f5PM315MNcl6YQ0k5kgpKIFbBs2sWGI8s55RPnpEUc-P4tlDUMtPARPo4uHXvUUh-wDGCGGoeZB7hgmDrC4IJjClCi7DOQQGBFeHsEV_DrdYJjE1S2wTUkq3S"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-primary">{currentUser?.name || 'George Corea'}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded w-fit ${
                  isSuperAdmin ? 'bg-purple-900/60 text-purple-300 border border-purple-700' :
                  isAdmin ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' :
                  'bg-sky-900/60 text-sky-300 border border-sky-700'
                }`}>
                  {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'PLAYER'}
                </span>
              </div>
            </div>
          </nav>

          {/* Mobile Header Controls */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={toggleLogs}
              className="p-2 rounded-full bg-surface-container border border-border-subtle text-primary"
              title="WebSocket Logs"
            >
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-primary-container text-on-primary-container font-bold flex items-center gap-1"
              aria-label="Toggle mobile menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>

        </div>

        {/* Mobile Slide-down Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-surface border-b border-border-subtle px-4 py-3 space-y-2 shadow-lg">
            <button
              onClick={() => handleTabChange('PLAYER')}
              className={`w-full text-left py-3 px-3.5 rounded-xl flex items-center gap-3 font-semibold transition-all ${
                activeTab === 'PLAYER'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">directions_run</span>
              <div className="flex flex-col">
                <span className="text-sm">Mobile Clue Runner</span>
                <span className="text-[10px] opacity-75">Field GPS & Clue Capture App</span>
              </div>
              <span className="ml-auto text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
            </button>

            <button
              onClick={() => handleTabChange('ADMIN')}
              className={`w-full text-left py-3 px-3.5 rounded-xl flex items-center gap-3 font-semibold transition-all ${
                activeTab === 'ADMIN'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">map</span>
              <div className="flex flex-col">
                <span className="text-sm">Admin Course Planner</span>
                <span className="text-[10px] opacity-75">Design Waypoints & Geofences</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('SCORING')}
              className={`w-full text-left py-3 px-3.5 rounded-xl flex items-center gap-3 font-semibold transition-all ${
                activeTab === 'SCORING'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">leaderboard</span>
              <div className="flex flex-col">
                <span className="text-sm">Leaderboard</span>
                <span className="text-[10px] opacity-75">Live Team Scores & Verification</span>
              </div>
            </button>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (1-thumb touch navigation for mobile phones) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-subtle shadow-xl px-2 py-1.5 flex justify-around items-center">
        <button
          onClick={() => handleTabChange('PLAYER')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'PLAYER'
              ? 'text-primary font-bold bg-primary-fixed/50 scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">directions_run</span>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">Clue Runner</span>
        </button>

        <button
          onClick={() => handleTabChange('ADMIN')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'ADMIN'
              ? 'text-primary font-bold bg-primary-fixed/50 scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">map</span>
          <span className="text-[10px] tracking-tight mt-0.5">Planner</span>
        </button>

        <button
          onClick={() => handleTabChange('SCORING')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'SCORING'
              ? 'text-primary font-bold bg-primary-fixed/50 scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">leaderboard</span>
          <span className="text-[10px] tracking-tight mt-0.5">Leaderboard</span>
        </button>

        <button
          onClick={toggleLogs}
          className="flex flex-col items-center py-1.5 px-3 rounded-xl text-on-surface-variant hover:text-on-surface"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[24px]">terminal</span>
            {logCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-primary text-on-primary text-[9px] font-bold px-1 rounded-full">
                {logCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Logs</span>
        </button>
      </nav>
    </>
  );
}

