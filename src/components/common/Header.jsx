import React, { useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header({ activeTab, setActiveTab, logCount, toggleLogs, activeTeam, currentUser, onOpenAuthModal, onOpenHelp }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSuperAdmin = currentUser && currentUser.email?.toLowerCase() === 'coreagc@gmail.com';
  const isAdmin = isSuperAdmin || (currentUser && currentUser.role === 'ADMIN');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-theme-surface/90 backdrop-blur-xl shadow-lg border-b border-theme text-theme-main transition-colors duration-300">
        <div className="h-16 w-full px-4 lg:px-8 flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-base cursor-pointer" onClick={() => handleTabChange('ADMIN')}>
            <span className="material-symbols-outlined text-theme-primary text-[32px]">forest</span>
            <span className="font-headline-md text-headline-md text-theme-primary tracking-tight">
              SpatialCourse <span className="font-normal opacity-70 text-theme-main">Crafter</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5">
            <button
              onClick={() => handleTabChange('ADMIN')}
              className={`transition-colors uppercase text-label-md ${
                activeTab === 'ADMIN' ? 'text-theme-primary font-bold' : 'text-theme-sub hover:text-theme-main'
              }`}
            >
              Planner
            </button>

            <button
              onClick={() => handleTabChange('PLAYER')}
              className={`transition-colors uppercase text-label-md flex items-center gap-1.5 ${
                activeTab === 'PLAYER' ? 'text-theme-primary font-bold' : 'text-theme-sub hover:text-theme-main'
              }`}
            >
              <span>Clue Runner</span>
            </button>

            <button
              onClick={() => handleTabChange('SCORING')}
              className={`transition-colors uppercase text-label-md ${
                activeTab === 'SCORING' ? 'text-theme-primary font-bold' : 'text-theme-sub hover:text-theme-main'
              }`}
            >
              Leaderboard
            </button>

            <button
              onClick={() => handleTabChange('ISSUES')}
              className={`transition-colors uppercase text-label-md flex items-center gap-1.5 ${
                activeTab === 'ISSUES' ? 'text-theme-primary font-bold' : 'text-theme-sub hover:text-theme-main'
              }`}
            >
              <span>Issue Tracker</span>
            </button>

            <button
              onClick={toggleLogs}
              className="font-label-md text-label-md text-theme-sub hover:text-theme-primary transition-colors uppercase flex items-center gap-1.5"
            >
              <span>Logs</span>
              <span className="bg-theme-primary/20 text-theme-primary px-2 py-0.5 rounded font-mono text-[10px]">
                {logCount}
              </span>
            </button>

            <button
              onClick={onOpenHelp}
              className="font-label-md text-label-md text-theme-sub hover:text-theme-primary transition-colors uppercase flex items-center gap-1"
              title="System Help & Documentation"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Help</span>
            </button>

            {/* Themes Switcher */}
            <div className="flex items-center gap-1.5">
              <ThemeSwitcher />
            </div>

            {/* User Profile (Initials Avatar Only) */}
            <div
              onClick={onOpenAuthModal}
              className="ml-2 border-l border-theme pl-4 flex items-center cursor-pointer group hover:opacity-90 transition-all"
              title={`Click to manage account auth (${currentUser?.name || 'George Corea'})`}
            >
              <div className="w-8 h-8 rounded-full bg-theme-primary/20 text-theme-primary border border-theme flex items-center justify-center font-bold text-xs group-hover:ring-2 group-hover:ring-theme-primary transition-all select-none">
                {(currentUser?.name || 'George Corea')
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            </div>
          </nav>

          {/* Mobile Header Controls */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeSwitcher compact={true} />
            <button
              onClick={onOpenHelp}
              className="p-2 rounded-lg bg-theme-container border border-theme text-theme-primary"
              title="System Help & Guide"
            >
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
            <button
              onClick={toggleLogs}
              className="p-2 rounded-lg bg-theme-container border border-theme text-theme-primary"
              title="WebSocket Logs"
            >
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-theme-container border border-theme text-theme-primary font-bold flex items-center gap-1"
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

            <button
              onClick={() => handleTabChange('ISSUES')}
              className={`w-full text-left py-3 px-3.5 rounded-xl flex items-center gap-3 font-semibold transition-all ${
                activeTab === 'ISSUES'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">bug_report</span>
              <div className="flex flex-col">
                <span className="text-sm">Issue & Feature Backlog</span>
                <span className="text-[10px] opacity-75">Bugs, Upvoting & Enhancements</span>
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
          onClick={() => handleTabChange('ISSUES')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'ISSUES'
              ? 'text-primary font-bold bg-primary-fixed/50 scale-105'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">bug_report</span>
          <span className="text-[10px] tracking-tight mt-0.5">Issues</span>
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

