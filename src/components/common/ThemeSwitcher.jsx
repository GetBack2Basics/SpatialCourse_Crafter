import React, { useState, useEffect, useRef } from 'react';
import { themeService, THEMES, THEME_CONFIGS } from '../../services/themeService';

export default function ThemeSwitcher({ compact = false }) {
  const [activeTheme, setActiveTheme] = useState(() => themeService.getTheme());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const unsubscribe = themeService.subscribe((newTheme) => {
      setActiveTheme(newTheme);
    });

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentConfig = THEME_CONFIGS.find(t => t.id === activeTheme) || THEME_CONFIGS[0];

  const handleSelectTheme = (themeId) => {
    themeService.setTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Theme Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          activeTheme === THEMES.HIGH_CONTRAST
            ? 'bg-[#182203] border-[#C2EF73] text-[#C2EF73] shadow-[0_0_10px_rgba(194,239,115,0.2)]'
            : activeTheme === THEMES.STUDIO
            ? 'bg-[#EFF4FF] border-[#1B365D]/30 text-[#1B365D] hover:border-[#1B365D]'
            : 'bg-[#0b1c30] border-[#00F2FF]/30 text-[#00F2FF] hover:border-[#00F2FF]'
        }`}
        title="Switch theme (Field Dark, Studio Light, High Contrast)"
        aria-label="Theme switcher menu"
        aria-expanded={isOpen}
      >
        {/* Redundant Encoding: Icon + Text Label */}
        <span className="material-symbols-outlined text-[18px] select-none">
          palette
        </span>
        
        {!compact && (
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">
            Themes
          </span>
        )}

        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider hidden md:inline-block ${
          activeTheme === THEMES.HIGH_CONTRAST
            ? 'bg-[#C2EF73]/20 border-[#C2EF73] text-[#C2EF73]'
            : activeTheme === THEMES.STUDIO
            ? 'bg-[#1B365D]/15 border-[#1B365D]/40 text-[#1B365D]'
            : 'bg-[#00F2FF]/15 border-[#00F2FF]/40 text-[#00F2FF]'
        }`}>
          {currentConfig.shortName}
        </span>

        <span className="material-symbols-outlined text-[16px] transition-transform duration-200">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Theme Options Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-2xl z-50 py-2 backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-150 ${
            activeTheme === THEMES.HIGH_CONTRAST
              ? 'bg-[#101501] border-[#C2EF73] text-white shadow-[0_0_20px_rgba(194,239,115,0.25)]'
              : activeTheme === THEMES.STUDIO
              ? 'bg-[#F8F9FF] border-[#1B365D]/20 text-[#0F172A] shadow-xl'
              : 'bg-[#031427] border-[#00F2FF]/30 text-white shadow-2xl'
          }`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1.5 mb-1 border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">palette</span>
              Theme System
            </span>
            <span className="text-[9px] opacity-60 font-mono">WCAG 4.5:1</span>
          </div>

          <div className="space-y-1 px-1.5">
            {THEME_CONFIGS.map((config) => {
              const isSelected = activeTheme === config.id;
              return (
                <button
                  key={config.id}
                  type="button"
                  onClick={() => handleSelectTheme(config.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-3 transition-all ${
                    isSelected
                      ? activeTheme === THEMES.HIGH_CONTRAST
                        ? 'bg-[#C2EF73]/20 border border-[#C2EF73] text-[#C2EF73]'
                        : activeTheme === THEMES.STUDIO
                        ? 'bg-[#1B365D]/15 border border-[#1B365D]/40 text-[#1B365D]'
                        : 'bg-[#00F2FF]/15 border border-[#00F2FF]/40 text-[#00F2FF]'
                      : 'hover:bg-white/10 opacity-85 hover:opacity-100 border border-transparent'
                  }`}
                  role="menuitem"
                >
                  <span className={`material-symbols-outlined text-[20px] mt-0.5 ${
                    isSelected ? 'scale-110' : 'opacity-70'
                  }`}>
                    {config.icon}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold tracking-tight">
                        {config.name}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">
                          check_circle
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] opacity-75 line-clamp-2 leading-tight mt-0.5">
                      {config.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 px-3 border-t border-white/10 flex items-center justify-between text-[9px] opacity-60">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">visibility</span>
              CVD Friendly
            </span>
            <span>ROUND_FOUR 8px</span>
          </div>
        </div>
      )}
    </div>
  );
}
