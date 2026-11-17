/** @type {import('tailwind.css').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0f9fa',
          100: '#d9f0f3',
          200: '#b3e1e7',
          300: '#7fc9d4',
          400: '#4aa8b9',
          500: '#2f8ba0',
          600: '#0f7290',
          700: '#0e5a72',
          800: '#114a5e',
          900: '#133e4f',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
