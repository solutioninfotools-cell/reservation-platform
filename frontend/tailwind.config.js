/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7350E8', light: '#9B7CF2', dark: '#5B3ECF', tint: '#E9E3FF' },
        ink: { DEFAULT: '#1B1730', soft: '#6B6580' },
        paper: '#F7F6FB',
        line: '#E7E3F3',
        status: {
          reserve: '#8957FF', arrive: '#2FA79D', encours: '#E2954A',
          termine: '#3FA65C', absent: '#8A8496', annule: '#D9483C',
        },
      },
      fontFamily: { sans: ['Poppins', 'ui-sans-serif', 'system-ui'] },
      borderRadius: { xl2: '18px' },
    },
  },
  plugins: [],
};