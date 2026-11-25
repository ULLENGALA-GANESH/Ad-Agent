/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09090b",
        panel: "#101014",
        line: "#27272a",
        muted: "#a1a1aa",
        accent: "#a3e635"
      },
      boxShadow: {
        glow: "0 0 35px rgba(163,230,53,.08)"
      }
    }
  },
  plugins: []
};