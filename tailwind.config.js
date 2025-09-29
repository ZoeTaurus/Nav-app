/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#34C759',
        danger: '#FF3B30',
        warning: '#FF9500',
        info: '#5856D6'
      }
    },
  },
  plugins: [],
}
