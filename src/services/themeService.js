// Theme Service managing FUNGIS GeoScore AI Unified Theme System
// Supported themes: 'field' (High-Contrast Dark Mode), 'studio' (High-Fidelity Light Mode), 'high-contrast' (Accessibility Optimized)

const STORAGE_KEY = 'fungis_theme_mode';
export const THEMES = {
  FIELD: 'field',
  STUDIO: 'studio',
  HIGH_CONTRAST: 'high-contrast'
};

export const THEME_CONFIGS = [
  {
    id: THEMES.FIELD,
    name: 'Field (Dark)',
    shortName: 'Field',
    desc: 'High-contrast dark mode optimized for outdoor GIS data collection.',
    icon: 'dark_mode',
    badge: 'DARK'
  },
  {
    id: THEMES.STUDIO,
    name: 'Studio (Light)',
    shortName: 'Studio',
    desc: 'High-fidelity light mode optimized for office and administrative planning.',
    icon: 'light_mode',
    badge: 'LIGHT'
  },
  {
    id: THEMES.HIGH_CONTRAST,
    name: 'High Contrast',
    shortName: 'High Contrast',
    desc: 'CVD-friendly high visibility theme based on fungis.org branding.',
    icon: 'contrast',
    badge: 'ACCESSIBLE'
  }
];

class ThemeService {
  constructor() {
    this.currentTheme = this.getInitialTheme();
    this.listeners = new Set();
  }

  getInitialTheme() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && Object.values(THEMES).includes(saved)) {
        return saved;
      }
    }
    return THEMES.FIELD; // Default theme as specified
  }

  getTheme() {
    return this.currentTheme;
  }

  setTheme(themeId) {
    if (!Object.values(THEMES).includes(themeId)) return;
    this.currentTheme = themeId;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, themeId);
      this.applyTheme(themeId);
    }
    this.notify();
  }

  applyTheme(themeId = this.currentTheme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    if (themeId === THEMES.STUDIO) {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.currentTheme);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentTheme));
  }
}

export const themeService = new ThemeService();
