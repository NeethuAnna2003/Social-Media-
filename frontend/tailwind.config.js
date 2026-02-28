/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",     // Blue
        secondary: "#10B981",   // Green
        dark: "#1F2937",        // Gray-800
        light: "#F9FAFB",       // Gray-50
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
}
