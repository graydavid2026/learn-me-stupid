/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/src/**/*.{js,ts,jsx,tsx}', './client/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1d27',
          elevated: '#242836',
          base: '#0f1117',
        },
        border: {
          DEFAULT: '#2e3348',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        warning: '#f59e0b',
        tier: {
          0: '#ef4444',
          1: '#f97316',
          2: '#f59e0b',
          3: '#eab308',
          4: '#84cc16',
          5: '#22c55e',
          6: '#14b8a6',
          7: '#06b6d4',
          8: '#22c55e',
        },
      },
      fontFamily: {
        heading: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
      },
    },
  },
  plugins: [],
};
