---
name: Fungis Geospatial Intelligence
colors:
  surface: '#0b1000'
  surface-dim: '#0b1000'
  surface-bright: '#263000'
  surface-container-lowest: '#000000'
  surface-container-low: '#101500'
  surface-container: '#151c00'
  surface-container-high: '#1b2300'
  surface-container-highest: '#202900'
  on-surface: '#f0fdbd'
  on-surface-variant: '#a5b177'
  inverse-surface: '#f4ffc6'
  inverse-on-surface: '#4f5a29'
  outline: '#6f7a47'
  outline-variant: '#424c1d'
  surface-tint: '#a1fd63'
  primary: '#a1fd63'
  on-primary: '#2b5f00'
  primary-container: '#5fb41f'
  on-primary-container: '#0f2900'
  inverse-primary: '#326c00'
  secondary: '#d2ef6a'
  on-secondary: '#485800'
  secondary-container: '#536600'
  on-secondary-container: '#f0ffb7'
  tertiary: '#fdff9d'
  on-tertiary: '#616300'
  tertiary-container: '#eff261'
  on-tertiary-container: '#585a00'
  error: '#ff7351'
  on-error: '#450900'
  error-container: '#b92902'
  on-error-container: '#ffd2c8'
  primary-fixed: '#a1fd63'
  primary-fixed-dim: '#94ee56'
  on-primary-fixed: '#204b00'
  on-primary-fixed-variant: '#316a00'
  secondary-fixed: '#d2ef6a'
  secondary-fixed-dim: '#c4e05e'
  on-secondary-fixed: '#374400'
  on-secondary-fixed-variant: '#506200'
  tertiary-fixed: '#fbfe6b'
  tertiary-fixed-dim: '#ecef5f'
  on-tertiary-fixed: '#4d4e00'
  on-tertiary-fixed-variant: '#6a6c00'
  primary-dim: '#94ee56'
  secondary-dim: '#c4e05e'
  tertiary-dim: '#ecef5f'
  error-dim: '#d53d18'
  background: '#0b1000'
  on-background: '#f0fdbd'
  surface-variant: '#202900'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Montserrat
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1440px
---

## Brand & Style
The brand personality is authoritative, precise, and ecologically grounded. It balances the technical rigor of GIS (Geographic Information Systems) with a natural, organic mission. The target audience includes environmental researchers, urban planners, and data scientists who require high-density information presented with clarity.

The visual style is **Corporate / Modern** with a **Vibrant** energy. It utilizes generous whitespace to offset complex data visualizations, ensuring the interface remains breathable. The aesthetic is defined by sharp execution, a structured information hierarchy, and a color palette that reinforces a connection to the natural world and environmental sustainability through more saturated, energetic tones.

## Colors
The system now utilizes a **Dark Mode** default to reduce eye strain during prolonged data analysis. The palette is anchored by "Neon Moss" (`#4DA100`), used for primary actions and key branding, providing high visibility against the dark canvas. "Olive Surge" (`#708801`) and "Sulfur Glow" (`#999C02`) serve as secondary and tertiary accents for data stratification and status indicators.

The neutral system is built on a "Forest Slate" (`#717C48`), which provides a warmer, organic undertone to the dark interface compared to standard grays. Surface colors are derived from this neutral base to ensure a cohesive, low-glare environment for GIS professionals.

## Typography
This design system utilizes **Montserrat** exclusively to maintain a modern, geometric, and highly legible appearance. Headlines are set with tight letter-spacing and heavy weights to convey authority. Body copy utilizes the standard weight for maximum readability in data-heavy contexts.

For technical data and GIS attributes, the `label-md` and `label-sm` styles use uppercase casing and increased tracking to differentiate metadata from prose. Mobile overrides are provided for top-tier headings to prevent overflow and maintain a balanced vertical rhythm on smaller viewports.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for dashboard views and a fluid approach for map interfaces. A 12-column grid is used for marketing and content pages, while the application interface uses a "Sidebar-Stage" model.

- **Desktop:** 12 columns, 24px gutters, 48px margins.
- **Tablet:** 8 columns, 16px gutters, 24px margins.
- **Mobile:** 4 columns, 16px gutters, 16px margins.

The spacing system is based on a 4px baseline grid. Elements are spaced using increments of 4 (4, 8, 12, 16, 24, 32, 48, 64) to ensure mathematical harmony across all components and layouts.

## Elevation & Depth
In this dark-mode environment, depth is conveyed through **Tonal Layers** and **Subtle Luminosity Changes** rather than traditional shadows. Surfaces closer to the user are rendered in lighter shades of the neutral palette.

- **Level 0 (Base):** The map or primary canvas (Dark/Dimmed).
- **Level 1 (Panels):** Sidebars and toolbars use a subtle 1px border (`#43483e`) to define boundaries.
- **Level 2 (Floating):** Popovers and tooltips use a slight increase in surface lightness to indicate elevation.
- **Level 3 (Modals):** Centered dialogs use a backdrop blur (8px) and a high-contrast border to focus user attention against the dark background.

## Shapes
A **Soft** (Level 1) roundedness is applied across the system. This subtle 4px radius on buttons and input fields softens the industrial feel of GIS data while remaining professional. Larger components like cards or modal containers may use the `rounded-lg` (8px) or `rounded-xl` (12px) tokens to create a more modern, approachable container for complex information.

## Components
- **Buttons:** Primary buttons use a solid `#4DA100` fill with dark text. Secondary buttons use an outline of the primary color. Buttons have a fixed height of 40px for standard actions.
- **Input Fields:** Fields are defined by a 1px border (`#43483e`) and a focus state of 2px `#708801`. Labels are always placed above the field using the `label-md` style.
- **Chips / Tags:** Used for map layers or filter attributes. They use a desaturated version of the accent colors (e.g., `#3c4a00`) with high-contrast text.
- **Cards:** Used for site summaries or AI-generated reports. Cards are flat with a 1px border, utilizing the `headline-md` for titles and the darker surface tokens for background.
- **Data Tables:** High-density grids with 1px horizontal dividers only. Row hover states use a subtle highlight of the primary green at low opacity.
- **Map Controls:** Floating pill-shaped buttons for zoom and orientation, utilizing a dark translucent background and `#4DA100` icons for a "Vibrant Dark" map experience.