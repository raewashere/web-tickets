/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './apps/**/*.{html,ts}',
    './store/**/*.{html,ts}',
    './admin/**/*.{html,ts}',
    './shared-ui/**/*.{html,ts}',
    './data-access/**/*.{html,ts}',
    './models/**/*.{html,ts}',
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Material Design 3 Core Roles ───────────────────────────────── */
        primary:              'rgb(var(--md-primary) / <alpha-value>)',
        'on-primary':         'rgb(var(--md-on-primary) / <alpha-value>)',
        'primary-container':  'rgb(var(--md-primary-container) / <alpha-value>)',
        'on-primary-container':'rgb(var(--md-on-primary-container) / <alpha-value>)',

        secondary:              'rgb(var(--md-secondary) / <alpha-value>)',
        'on-secondary':         'rgb(var(--md-on-secondary) / <alpha-value>)',
        'secondary-container':  'rgb(var(--md-secondary-container) / <alpha-value>)',
        'on-secondary-container':'rgb(var(--md-on-secondary-container) / <alpha-value>)',

        tertiary:              'rgb(var(--md-tertiary) / <alpha-value>)',
        'on-tertiary':         'rgb(var(--md-on-tertiary) / <alpha-value>)',
        'tertiary-container':  'rgb(var(--md-tertiary-container) / <alpha-value>)',
        'on-tertiary-container':'rgb(var(--md-on-tertiary-container) / <alpha-value>)',

        /* ── Surface & Background ───────────────────────────────────────── */
        surface:              'rgb(var(--md-surface) / <alpha-value>)',
        'on-surface':         'rgb(var(--md-on-surface) / <alpha-value>)',
        'surface-variant':    'rgb(var(--md-surface-variant) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--md-on-surface-variant) / <alpha-value>)',
        'surface-container':  'rgb(var(--md-surface-container) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--md-surface-container-high) / <alpha-value>)',
        'surface-container-low':  'rgb(var(--md-surface-container-low) / <alpha-value>)',
        'inverse-surface':    'rgb(var(--md-inverse-surface) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--md-inverse-on-surface) / <alpha-value>)',

        /* ── Error ──────────────────────────────────────────────────────── */
        error:       'rgb(var(--md-error) / <alpha-value>)',
        'on-error':  'rgb(var(--md-on-error) / <alpha-value>)',
        'error-container':    'rgb(var(--md-error-container) / <alpha-value>)',
        'on-error-container': 'rgb(var(--md-on-error-container) / <alpha-value>)',

        /* ── Outline ────────────────────────────────────────────────────── */
        outline:         'rgb(var(--md-outline) / <alpha-value>)',
        'outline-variant':'rgb(var(--md-outline-variant) / <alpha-value>)',

        /* ── Legacy aliases (keep backward-compat for any remaining refs) ─ */
        accent:   'rgb(var(--md-secondary) / <alpha-value>)',
        dark:     'rgb(var(--md-inverse-surface) / <alpha-value>)',
        contrast: 'rgb(var(--md-secondary) / <alpha-value>)',
        danger:   'rgb(var(--md-error) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
