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
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // ATTENDING AI Teal Brand System
        attending: {
          'deep-navy': '#0C3547',
          'header-dark': '#0C4C5E',
          'primary': '#1A8FA8',
          'light-teal': '#25B8A9',
          'gold': '#F0A500',
          'coral': '#E87461',
          50: '#E8F6F8',
          100: '#D4EEF6',
          200: '#B0D8E4',
          300: '#7BBECF',
          400: '#3AA3BB',
          500: '#1A8FA8',
          600: '#157A90',
          700: '#0C4C5E',
          800: '#0C3547',
          900: '#082530',
          950: '#051A22',
        },
        // Teal shorthand
        teal: {
          dark: '#0C4C5E',
          mid: '#0F5F76',
          DEFAULT: '#1A8FA8',
          light: '#25B8A9',
          pale: '#E6F7F5',
        },
        // Accent colors
        gold: {
          DEFAULT: '#F0A500',
          dark: '#D48F00',
          light: '#FEF8E7',
        },
        coral: {
          DEFAULT: '#E87461',
          light: '#FCE8E5',
        },
        // Surface tokens
        surface: {
          bg: '#F0F7F9',
          card: '#FFFFFF',
          hover: '#F7FBFC',
        },
        // Clinical semantic colors
        clinical: {
          urgent: '#DC2626',
          warning: '#F0A500',
          success: '#22C55E',
          info: '#1A8FA8',
        },
        // Compass (patient-facing)
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
        },
      },
      borderColor: {
        light: '#D4EEF6',
        DEFAULT: '#B0D8E4',
        strong: '#1A8FA8',
      },
      boxShadow: {
        'attending': '0 4px 12px rgba(12, 53, 71, 0.08)',
        'attending-lg': '0 8px 24px rgba(12, 53, 71, 0.12)',
        'teal': '0 4px 14px rgba(26, 143, 168, 0.2)',
        'teal-lg': '0 8px 24px rgba(26, 143, 168, 0.25)',
      },
    },
  },
  plugins: [],
};
