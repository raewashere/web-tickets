/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/**/*.{html,ts}',
    './libs/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary:  '#0bdef5',   // Main cyan — links, active states, brand
        surface:  '#fff3f0',   // Text & icons on dark backgrounds
        accent:   '#f7e733',   // Yellow highlight — stats, prices, badges
        dark:     '#150811',   // Text & icons on light backgrounds
        contrast: '#e11392',   // CTAs, urgency, danger actions
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
