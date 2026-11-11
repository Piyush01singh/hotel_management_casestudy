/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070B14",
          900: "#0B0F19",
          850: "#0F1626",
          800: "#131C2E",
          700: "#1B2842",
          600: "#243456",
        },
        slate: {
          850: "#151F32",
        },
        accent: {
          emerald: "#10B981",
          teal: "#14B8A6",
          amber: "#F59E0B",
          rose: "#EF4444",
          cyan: "#06B6D4",
        }
      },
    },
  },
  plugins: [],
}
