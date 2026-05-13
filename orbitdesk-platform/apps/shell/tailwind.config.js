/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: {
          600: '#7C3AED',
          700: '#6D28D9',
          500: '#8B5CF6',
        },
        sidebar: {
          bg: '#0F0F13',
          border: '#1A1A24',
          muted: '#6B7280',
          hover: '#1C1C28',
          active: '#7C3AED',
        },
      },
      width: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
      },
      transitionProperty: {
        sidebar: 'width, transform',
      },
    },
  },
  plugins: [],
}
