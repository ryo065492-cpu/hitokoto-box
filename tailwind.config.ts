import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F8F3EA",
        ink: "#3A3129",
        clay: "#B96D4A",
        leaf: "#708B75",
        mist: "#E8DED0",
        blush: "#F2E4DB"
      },
      boxShadow: {
        quiet: "0 18px 50px rgba(71, 57, 43, 0.08)"
      },
      borderRadius: {
        calm: "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
