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
        primary:  '#4e0a0b',   // Guinda profundo — links, estados activos, brand
        surface:  '#f2eee8',   // Marfil cálido — texto e iconos sobre fondos oscuros
        accent:   '#e38792',   // Rosa suave — precios, badges, highlights, CTA
        dark:     '#14281d',   // Verde forestal oscuro — fondo hero, sidebar, texto
        contrast: '#355834',   // Verde acento — acciones positivas, seguridad
        danger:   '#c0392b',   // Rojo — eliminar, cancelar, alertas destructivas
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
