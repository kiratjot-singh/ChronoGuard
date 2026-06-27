/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc", // Clean slate-50 background
        card: "#ffffff", // Pure white card
        primary: "#3b82f6", // Vibrant royal blue
        accent: "#10b981", // Emerald accent
        border: "#e2e8f0" // Slate-200 border
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
