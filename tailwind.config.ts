import type { Config } from "tailwindcss";
import { palette } from "./lib/brand";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Linear-ish neutral palette
        canvas: "#F1F1F2", // page background / sidebar
        panel: "#F7F7F8", // main content area
        line: "#e4e4e6", // light grey borders
        line2: "#e2e2e4", // textbox / card borders (light grey)
        ink: "#1c1c1e", // near-black text
        sub: "#5b5b63", // dark-grey (icons/secondary)
        faint: "#8a8a92",
        hover: "#e7e7e9", // sidebar item hover (sits on #F1F1F2)
        // Brand colours live in lib/brand.ts — change them there, not here.
        brand: palette.primary,
        brandsoft: palette.primarySoft,
        branddeep: palette.primaryDeep,
        ink2: "#1a1a1a",
      },
      borderRadius: { panel: "14px" },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
