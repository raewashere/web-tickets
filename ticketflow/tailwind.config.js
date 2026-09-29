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
        primary:  'rgb(var(--color-primary) / <alpha-value>)',
        surface:  'rgb(var(--color-surface) / <alpha-value>)',
        accent:   'rgb(var(--color-accent) / <alpha-value>)',
        dark:     'rgb(var(--color-dark) / <alpha-value>)',
        contrast: 'rgb(var(--color-contrast) / <alpha-value>)',
        danger:   'rgb(var(--color-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
