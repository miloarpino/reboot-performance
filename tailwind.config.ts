import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        reboot: {
          ink: "#0c0b09",
          anthracite: "#171512",
          ivory: "#f7f1e8",
          bronze: "#c99a55",
          champagne: "#e6c27d"
        }
      },
      borderRadius: {
        reboot: "18px"
      }
    }
  },
  plugins: []
};

export default config;
