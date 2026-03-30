/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['DM Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
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
        },
        surface: {
          bg: '#F0F7F9',
          card: '#FFFFFF',
          hover: '#F7FBFC',
          elevated: '#FFFFFF',
        },
        clinical: {
          urgent: '#DC2626',
          warning: '#F0A500',
          success: '#22C55E',
          info: '#1A8FA8',
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
      borderRadius: {
        'attending': '12px',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
