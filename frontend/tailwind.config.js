/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Swimming theme (pool blues) ── keep for easy sport switch back
        pool: {
          50:  '#eff6ff',
          100: '#dbeafe',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a5f',
          900: '#0f2044',
        },
        // ── Track & Field theme (amber / burnt-orange) ──────────────────
        // To switch back to swimming: change index.css pool-* → track-* refs
        track: {
          50:  '#fffbeb',
          100: '#fef3c7',
          600: '#d97706',
          700: '#b45309',
          800: '#78350f',   // deep amber-brown — used for sidebar & buttons
          900: '#451a03',
        },
      },
    },
  },
  plugins: [],
}
