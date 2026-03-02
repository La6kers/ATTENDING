/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // =================================================================
        // ATTENDING AI Brand — Teal / Coral / Gold
        // =================================================================
        navy: {
          DEFAULT: '#0C3547',
        },
        teal: {
          dark: '#0C4C5E',
          mid: '#0F5F76',
          DEFAULT: '#1A8FA8',
          light: '#25B8A9',
          pale: '#E6F7F5',
        },
        gold: {
          DEFAULT: '#F0A500',
          dark: '#D48F00',
          light: '#FEF8E7',
        },
        coral: {
          DEFAULT: '#E87461',
          light: '#FCE8E5',
        },

        // COMPASS uses the same brand teal as primary
        compass: {
          50: '#E6F7F5',
          100: '#D4EEF6',
          200: '#B0D8E4',
          300: '#7BBECF',
          400: '#3AA3BB',
          500: '#1A8FA8',
          600: '#0F5F76',
          700: '#0C4C5E',
          800: '#0C3547',
          900: '#082530',
          950: '#051A22',
        },

        // Clinical triage colors
        triage: {
          emergency: '#dc2626',
          urgent: '#f97316',
          moderate: '#F0A500',   // Brand gold
          routine: '#22c55e',
        },

        // Emergency (Reserved)
        emergency: '#EF4444',

        // Surface tokens
        surface: {
          bg: '#F0F7F9',
          card: '#FFFFFF',
          hover: '#F7FBFC',
        },
      },
      backgroundImage: {
        'compass-gradient': 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
        'compass-gradient-body': 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
        'compass-gradient-light': 'linear-gradient(135deg, #E6F7F5 0%, #F0F7F9 100%)',
        'compass-gradient-gold': 'linear-gradient(135deg, #F0A500 0%, #D48F00 100%)',
      },
      boxShadow: {
        'teal': '0 4px 14px rgba(26, 143, 168, 0.2)',
        'teal-lg': '0 8px 24px rgba(26, 143, 168, 0.25)',
        'gold': '0 4px 14px rgba(240, 165, 0, 0.2)',
        'coral': '0 4px 14px rgba(232, 116, 97, 0.2)',
        'card-sm': '0 1px 3px rgba(12, 53, 71, 0.06)',
        'card-md': '0 4px 12px rgba(12, 53, 71, 0.08)',
      },
      animation: {
        'pulse-urgent': 'pulse-urgent 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-urgent': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '50%': { opacity: '0.9', boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
