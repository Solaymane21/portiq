/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        muted: '#7A7A7A',
        negrofondo: '#080808',
        gris25: '#252525',
        card: '#171717',
        // #d6d8d5 para modo claro de card
        ganancia: '#00C853',
        perdida: '#FF1744'
      },
      fontFamily: {
        ibm: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}

