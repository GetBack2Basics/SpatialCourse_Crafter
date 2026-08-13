import React from 'react';

export default function Footer() {
  // Timestamp in yyyymmddhhmm format dynamically injected at build time
  const buildTimestamp = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : '202608130952';

  return (
    <footer className="w-full bg-theme-surface/90 backdrop-blur-md border-t border-theme text-theme-sub py-3 px-4 sm:px-8 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 z-30 transition-colors duration-300">
      {/* Left side: (c)(r) A project of Get Back 2 Basics with link to GitHub */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
        <span className="font-semibold text-theme-main select-none">© ®</span>
        <span>A project of</span>
        <a
          href="https://github.com/GetBack2Basics"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-theme-primary hover:underline flex items-center gap-1 transition-colors"
          title="Visit Get Back 2 Basics on GitHub"
        >
          <span>Get Back 2 Basics</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>

      {/* Right side: Built: yyyymmddhhmm */}
      <div className="font-telemetry text-[11px] opacity-80 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[14px] text-theme-primary">build</span>
        <span>Built: {buildTimestamp}</span>
      </div>
    </footer>
  );
}
