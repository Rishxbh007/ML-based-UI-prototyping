/** @type {import('tailwindcss').Config} */
// ─────────────────────────────────────────────────────────────────────────
// Morph platform design system — "the language-to-interface instrument".
//
// This is the design language of the PLATFORM (marketing site + editor). It is
// deliberately NOT the language of the generated prototypes — those carry their
// own token set and render in isolation inside the phone frame.
//
// Identity: a single quiet white page, near-black ink with a faint warm cast,
// three greys, and ONE restrained indigo-violet accent. Editorial, precise,
// typography-led. Expensive by way of space, alignment and restraint — never
// by neon, glow, gradient washes or a kit of identical rounded cards.
// ─────────────────────────────────────────────────────────────────────────
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // One page. Warm off-white is used only as a rare inset "stage".
        canvas: "#FFFFFF",
        paper: "#F5F4F1", // warm off-white — the single inset environment
        surface: {
          DEFAULT: "#FFFFFF",
          raised: "#F7F6F3",
          overlay: "#EEEDE9",
        },
        // Hairlines. Borders do the work colour used to — kept near-invisible.
        line: {
          DEFAULT: "rgba(23,22,27,0.09)",
          strong: "rgba(23,22,27,0.15)",
        },
        // Ink — a near-black with a faint warm-violet cast so it relates to the
        // accent without ever reading as "tinted grey standing in for black".
        ink: {
          DEFAULT: "#17161B",
          soft: "#47454F",
          muted: "#6C6A74",
          faint: "#A2A0A9",
        },
        // The single accent — a refined indigo-violet. Small emphases, focus,
        // the classifier's own colour, the one primary action. Never a fill.
        morph: {
          50: "#F2EFFE",
          100: "#E6E0FD",
          200: "#CCBFFB",
          300: "#AA97F6",
          400: "#8265EF",
          500: "#5B3DF5", // primary accent
          600: "#4A2CE0",
          700: "#3C22B4",
          800: "#2F1B8A",
          900: "#221461",
        },
        // Analytic hue for genuine ML "semantic" material only.
        teal: {
          500: "#0E9E96",
          600: "#0B7E77",
        },
        success: "#0E8A5F",
        warning: "#B4690E",
        danger: "#DC2626",
        // shadcn-compatible aliases mapped onto Morph's own palette, so ported
        // shadcn/21st.dev components (which reference these token names) resolve
        // and render on-brand. Additive — no existing Morph token is changed.
        background: "#FFFFFF",
        foreground: "#17161B",
        muted: "#EEEDE9",
        "muted-foreground": "#6C6A74",
        border: "#E6E4E0",
      },
      fontFamily: {
        // ONE voice for UI, body and headings — Inter, used with intent.
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        // Reserved strictly for real ML data material (tokens, labels, scores).
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6vw, 5rem)", { lineHeight: "1.0", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display": ["clamp(1.75rem, 3.4vw, 2.6rem)", { lineHeight: "1.06", letterSpacing: "-0.032em", fontWeight: "600" }],
        "title": ["1.3125rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "600" }],
        "index": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "500" }],
      },
      maxWidth: {
        content: "1120px",
        prose: "68ch",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      boxShadow: {
        // Two earned elevations. Applied only to the composer and the live
        // prototype — the two surfaces that genuinely float.
        soft: "0 1px 2px rgba(23,22,27,0.04), 0 6px 20px -10px rgba(23,22,27,0.10)",
        raised: "0 2px 6px rgba(23,22,27,0.05), 0 24px 60px -28px rgba(23,22,27,0.22)",
        ring: "0 0 0 1px rgba(23,22,27,0.07)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
