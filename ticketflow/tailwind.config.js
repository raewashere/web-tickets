/** @type {import('tailwindcss').Config} */
module.exports = {
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
        primary:  '#06b6d4',   // Electric Cyan — links, badges, active brand
        surface:  '#f8fafc',   // Clean slate-50 light background
        accent:   '#f59e0b',   // Warm Amber/Gold highlight — stats, badges
        dark:     '#0f172a',   // Deep Obsidian / Slate-900 — text, dark cards & headers
        contrast: '#f43f5e',   // Rose / Coral — CTAs, urgency, highlights
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
