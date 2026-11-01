/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F7F1E3',
        sage: '#9CAF88',
        'sage-dark': '#6F8A5B',
        wood: '#8B5E3C',
        ink: '#3B2F2F',
      },
    },
  },
  plugins: [],
}
