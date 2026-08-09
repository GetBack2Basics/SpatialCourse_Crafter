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
        // Dynamic Theme Tokens mapping to CSS variables
        surface: "var(--theme-surface)",
        "surface-container": "var(--theme-surface-container)",
        "surface-container-low": "var(--theme-surface-container)",
        "surface-container-lowest": "var(--theme-surface-container)",
        "surface-container-high": "var(--theme-surface-container-high)",
        "surface-container-highest": "var(--theme-surface-container-high)",
        "surface-bright": "var(--theme-surface-container-high)",
        "surface-variant": "var(--theme-surface-container)",
        "surface-dim": "var(--theme-surface)",
        
        primary: "var(--theme-primary)",
        "primary-container": "var(--theme-primary-container)",
        "primary-dim": "var(--theme-primary)",
        "primary-fixed": "var(--theme-primary)",
        "primary-fixed-dim": "var(--theme-primary)",
        "on-primary": "var(--theme-surface)",
        "on-primary-container": "var(--theme-primary)",

        secondary: "var(--theme-secondary)",
        "secondary-container": "var(--theme-secondary-container)",
        "secondary-fixed": "var(--theme-secondary)",
        "on-secondary": "var(--theme-surface)",
        "on-secondary-container": "var(--theme-secondary)",

        success: "var(--theme-success)",
        "success-container": "var(--theme-success-container)",

        tertiary: "var(--theme-secondary)",
        "tertiary-container": "var(--theme-secondary-container)",

        "on-surface": "var(--theme-text-primary)",
        "on-surface-variant": "var(--theme-text-secondary)",
        "on-background": "var(--theme-text-primary)",
        background: "var(--theme-surface)",

        outline: "var(--theme-border)",
        "outline-variant": "var(--theme-border)",
        "border-subtle": "var(--theme-border)",

        error: "#ff7351",
        "error-container": "#b92902",
        "on-error": "#ffffff",
      },
      borderRadius: {
        "DEFAULT": "8px",
        "lg": "8px",
        "xl": "12px",
        "full": "9999px"
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
        "headline-lg": ["Montserrat", "sans-serif"],
        "headline-lg-mobile": ["Montserrat", "sans-serif"],
        "label-sm": ["Montserrat", "sans-serif"],
        "headline-md": ["Montserrat", "sans-serif"],
        "body-md": ["Montserrat", "sans-serif"],
        "body-sm": ["Montserrat", "sans-serif"],
        "body-lg": ["Montserrat", "sans-serif"],
        "headline-xl": ["Montserrat", "sans-serif"],
        "label-md": ["Montserrat", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "headline-lg-mobile": ["28px", { "lineHeight": "36px", "fontWeight": "700" }],
        "label-sm": ["10px", { "lineHeight": "14px", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "headline-xl": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }]
      }
    }
  },
  plugins: [],
}
