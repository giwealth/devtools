/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      borderColor: {
        DEFAULT: "var(--border)",
      },
      colors: {
        primary: "var(--primary)",
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
          hover: "var(--surface-hover)",
        },
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
        },
        "json-pane": "var(--json-pane-bg)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "system-ui", "sans-serif"],
        display: ["Inter", "Noto Sans SC", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
