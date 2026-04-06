/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'base': '#0C0C0C',
        'fondo': '#222222',
        'card': '#171717',
        'interactivo': '#1C1C1C',
        'naranja-principal': '#FA7315',
        'naranja-secundario': '#2E1F15',
        'muted': '#AAAAAA',
        'borde': '#555555',
        'ganancia': '#22C55E',
        'perdida': '#EF4444',
      },
      fontFamily: {
        ibm: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}

