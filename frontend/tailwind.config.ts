import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System v2 Neutral Scale
        gray: {
          25: "var(--gray-25)",
          50: "var(--gray-50)",
          100: "var(--gray-100)",
          200: "var(--gray-200)",
          300: "var(--gray-300)",
          500: "var(--gray-500)",
          700: "var(--gray-700)",
          900: "var(--gray-900)",
        },
        // Design System v2 Brand / Primary
        primary: {
          50: "var(--primary-50)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          DEFAULT: "var(--primary-600)",
          hover: "var(--primary-700)",
        },
        // Semantic status colors
        success: {
          DEFAULT: "var(--success-600)",
          600: "var(--success-600)",
          text: "var(--success-text)",
          bg: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning-600)",
          600: "var(--warning-600)",
          text: "var(--warning-text)",
          bg: "var(--warning-bg)",
        },
        danger: {
          DEFAULT: "var(--danger-600)",
          600: "var(--danger-600)",
          text: "var(--danger-text)",
          bg: "var(--danger-bg)",
        },
        info: {
          DEFAULT: "var(--info-600)",
          600: "var(--info-600)",
          text: "var(--info-text)",
          bg: "var(--info-bg)",
        },
        // Surface & Background aliases
        background: "var(--gray-25)",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "var(--gray-50)",
        },
        border: {
          DEFAULT: "var(--gray-200)",
          strong: "var(--gray-300)",
        },
      },
      fontSize: {
        display: ["28px", { lineHeight: "36px", fontWeight: "600" }],
        h1: ["22px", { lineHeight: "28px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04)",
        floating: "0 8px 24px rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        badge: "6px",
        control: "8px",
        card: "12px",
        drawer: "14px",
        container: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
