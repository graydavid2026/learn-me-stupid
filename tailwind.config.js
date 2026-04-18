/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/src/**/*.{js,ts,jsx,tsx}', './client/index.html'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '420px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        surface: {
          DEFAULT: '#151720',
          elevated: '#1c1e2b',
          base: '#0c0d14',
        },
        border: {
          DEFAULT: '#232638',
          subtle: '#1a1d2e',
        },
        accent: {
          DEFAULT: '#d4a853',
          hover: '#e0ba6a',
          muted: '#d4a85320',
        },
        secondary: {
          DEFAULT: '#5b8a9a',
          hover: '#6fa0b2',
        },
        text: {
          primary: '#e4e4e7',
          secondary: '#8b8d9a',
          tertiary: '#5c5e6e',
        },
        success: '#3d9a6e',
        error: '#c75a5a',
        warning: '#c9943b',
        tier: {
          0: '#c75a5a',
          1: '#c97a3b',
          2: '#c9943b',
          3: '#b8a44a',
          4: '#7aab5a',
          5: '#3d9a6e',
          6: '#3a8a8a',
          7: '#4a8aaa',
          8: '#3d9a6e',
        },
      },
      fontFamily: {
        heading: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        modal: '14px',
      },
    },
  },
  plugins: [],
};
