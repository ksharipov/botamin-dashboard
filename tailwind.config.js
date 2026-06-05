/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B3E',
        lavender: '#ECEDF5',
        purple: {
          DEFAULT: '#8B5CF6',
          light: '#EDE9FE',
          dark: '#6D28D9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
