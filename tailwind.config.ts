import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        muted: "#64748B",
        line: "#D9E2EC",
        field: "#F8FAFC",
        brand: "#0F766E",
        accent: "#B45309"
      }
    }
  },
  plugins: []
};

export default config;
