const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.resolve(__dirname, 'index.html'),
    path.resolve(__dirname, 'src/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {
      screens: {
        'xs': '400px',
      },
      colors: {
        attending: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36adf6',
          500: '#0c93e7',
          600: '#0074c5',
          700: '#015da0',
          800: '#064f84',
          900: '#0b426e',
          950: '#072a49',
        },
        compass: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      }
    },
  },
  plugins: [],
};
