/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-elevated)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        accentSoft: 'var(--color-accent-soft)',
        successSoft: 'var(--color-success-soft)',
      },
      boxShadow: {
        float: '0 18px 48px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
