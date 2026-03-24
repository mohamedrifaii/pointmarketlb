window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#004288",
        "primary-container": "#0059b3",
        secondary: "#00687a",
        "secondary-container": "#6ae1ff",
        tertiary: "#752d00",
        background: "#f9f9fc",
        surface: "#f9f9fc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f3f6",
        "surface-container": "#eeeef0",
        "surface-container-high": "#e8e8ea",
        "surface-container-highest": "#e2e2e5",
        "on-surface": "#1a1c1e",
        "on-surface-variant": "#434654",
        "on-primary": "#ffffff",
        "on-secondary-container": "#006374",
        "on-secondary-fixed-variant": "#004e5d",
        "outline-variant": "#c3c6d6",
        error: "#ba1a1a",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
};
