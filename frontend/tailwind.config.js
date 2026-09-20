/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7350E8', light: '#9B7CF2', soft: '#E9E3FF', dark: '#5A3CC2' },
        ink: { DEFAULT: '#2B2650', soft: '#777486' },
        paper: '#F7F6FA',
        card: '#FFFFFF',
        line: '#E5E2EE',
        status: {
          reserve: '#8957FF', arrive: '#2FA79D', encours: '#E2954A',
          termine: '#3FA65C', absent: '#8A8496', annule: '#D9483C',
        },
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui'] },
      boxShadow: { 'card': '0 2px 12px rgba(43, 38, 80, 0.04)' },
      borderRadius: { xl2: '18px' },
    },
  },
  plugins: [],
};
