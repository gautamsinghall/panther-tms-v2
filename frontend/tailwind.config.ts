import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System v2 Neutral Scale - Slate-tinted
        gray: {
          25: "var(--gray-25)",
          50: "var(--gray-50)",
          100: "var(--gray-100)",
          200: "var(--gray-200)",
          300: "var(--gray-300)",
          400: "var(--gray-400)",
          500: "var(--gray-500)",
          600: "var(--gray-600)",
          700: "var(--gray-700)",
          800: "var(--gray-800)",
          900: "var(--gray-900)",
        },
        // Design System Brand / Primary (Indigo)
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          500: "var(--primary-500)",
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
          subtle: "var(--gray-50)",
          muted: "var(--gray-100)",
        },
        border: {
          DEFAULT: "var(--gray-200)",
          subtle: "var(--border-subtle)",
          strong: "var(--gray-300)",
        },
      },
      fontSize: {
        micro: ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        h3: ["15px", { lineHeight: "22px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        h1: ["22px", { lineHeight: "28px", fontWeight: "600" }],
        display: ["28px", { lineHeight: "34px", fontWeight: "600" }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        heading: ["var(--font-heading)", "Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        sm: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 4px 12px 0 rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.08)",
        floating: "0 12px 32px -4px rgba(15, 23, 42, 0.1), 0 4px 12px -2px rgba(15, 23, 42, 0.05)",
      },
      borderRadius: {
        badge: "6px",
        control: "8px",
        card: "12px",
        drawer: "16px",
        container: "16px",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
