/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scadaBg: '#121212',
        scadaPanel: '#1E1E1E',
        scadaAccent: '#00ADB5',
        alertRed: '#FF4C4C',
        statusGreen: '#00E676'
      }
    },
  },
  plugins: [],
}