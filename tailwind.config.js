/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary-fixed": "#c6efa6",
        "on-tertiary-container": "#ffcbe8",
        "secondary-fixed-dim": "#aad55d",
        "on-error": "#ffffff",
        "outline": "#73796c",
        "primary-fixed-dim": "#abd28c",
        "tertiary-fixed": "#ffd8ec",
        "surface-muted": "#F8F9FA",
        "surface": "#f7f9ff",
        "tertiary-fixed-dim": "#fab0dd",
        "on-tertiary-fixed": "#37062b",
        "surface-dim": "#d7dadf",
        "on-error-container": "#93000a",
        "on-primary-fixed-variant": "#2f4f18",
        "primary": "#2f4f18",
        "on-secondary-fixed-variant": "#354e00",
        "text-secondary": "#828487",
        "error": "#ba1a1a",
        "on-primary-fixed": "#0a2000",
        "surface-bright": "#f7f9ff",
        "on-secondary-container": "#4b6c00",
        "on-surface": "#181c20",
        "on-tertiary-fixed-variant": "#6b3359",
        "border-subtle": "#DEE2E6",
        "surface-tint": "#45672d",
        "inverse-primary": "#abd28c",
        "on-background": "#181c20",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#874b72",
        "inverse-on-surface": "#eef1f6",
        "on-primary-container": "#bde59e",
        "outline-variant": "#c3c8ba",
        "secondary-container": "#c2ef73",
        "inverse-surface": "#2d3135",
        "tertiary": "#6c3459",
        "primary-container": "#46682e",
        "on-secondary": "#ffffff",
        "surface-container-low": "#f1f4f9",
        "on-primary": "#ffffff",
        "on-surface-variant": "#43483d",
        "surface-variant": "#e0e3e8",
        "secondary": "#486800",
        "surface-container": "#ebeef3",
        "secondary-fixed": "#c5f175",
        "surface-container-high": "#e5e8ee",
        "background": "#f7f9ff",
        "error-container": "#ffdad6",
        "surface-container-highest": "#e0e3e8",
        "on-secondary-fixed": "#131f00",
        "surface-container-lowest": "#ffffff"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "gutter": "24px",
        "base": "4px",
        "margin-desktop": "48px",
        "margin-mobile": "16px",
        "max-width": "1440px"
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        headline: ["Montserrat", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      }
    }
  },
  plugins: [],
}
