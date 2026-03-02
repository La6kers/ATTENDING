/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS Variable-based colors (shadcn/ui compatible)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // =================================================================
        // ATTENDING AI Brand — Teal / Coral / Gold
        // =================================================================
        brand: {
          50: '#E6F7F5',       // Pale Mint
          100: '#D4EEF6',
          200: '#B0D8E4',
          300: '#7BBECF',
          400: '#3AA3BB',
          500: '#1A8FA8',      // Primary Teal
          600: '#0F5F76',      // Mid Teal
          700: '#0C4C5E',      // Header Dark
          800: '#0C3547',      // Deep Navy
          900: '#082530',
          950: '#051A22',
        },
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

        // =================================================================
        // Clinical Status Colors — Healthcare-specific palette
        // =================================================================
        clinical: {
          urgent: '#EF4444',
          'urgent-bg': '#fef2f2',
          warning: '#F0A500',        // Using brand gold
          'warning-bg': '#FEF8E7',   // Using gold light
          success: '#10b981',
          'success-bg': '#ecfdf5',
          info: '#1A8FA8',           // Using brand teal
          'info-bg': '#E6F7F5',      // Using pale mint
          
          // Triage Colors (medical standards)
          triage: {
            resuscitation: '#dc2626',
            emergent: '#f97316',
            urgent: '#fbbf24',
            'less-urgent': '#22c55e',
            'non-urgent': '#1A8FA8',  // Brand teal
          },
          
          // Lab Result Status
          normal: '#16a34a',
          abnormal: '#ea580c',
          critical: '#dc2626',
          pending: '#6b7280',
          
          // AI Confidence Levels
          ai: {
            high: '#1A8FA8',     // Brand teal
            medium: '#F0A500',   // Brand gold
            low: '#a1a1aa',
          },
        },

        // Emergency (Reserved)
        emergency: '#EF4444',

        // =================================================================
        // Surface tokens
        // =================================================================
        surface: {
          bg: '#F0F7F9',
          card: '#FFFFFF',
          hover: '#F7FBFC',
          elevated: '#FFFFFF',
        },
      },
      
      // =================================================================
      // Gradients — Brand
      // =================================================================
      backgroundImage: {
        // ATTENDING AI Brand Gradients
        'brand-gradient': 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
        'brand-gradient-header': 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, #E6F7F5 0%, #F0F7F9 100%)',
        'brand-gradient-dark': 'linear-gradient(135deg, #0C3547 0%, #0C4C5E 100%)',
        'brand-gradient-gold': 'linear-gradient(135deg, #F0A500 0%, #D48F00 100%)',
        
        // Clinical Gradients
        'clinical-urgent': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        'clinical-warning': 'linear-gradient(135deg, #F0A500 0%, #D48F00 100%)',
        'clinical-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'clinical-info': 'linear-gradient(135deg, #1A8FA8 0%, #0F5F76 100%)',
        
        // Feature Gradients
        'labs-gradient': 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
        'imaging-gradient': 'linear-gradient(135deg, #1A8FA8 0%, #0F5F76 100%)',
        'meds-gradient': 'linear-gradient(135deg, #F0A500 0%, #D48F00 100%)',
        'ai-gradient': 'linear-gradient(135deg, #1A8FA8 0%, #0C4C5E 100%)',
      },
      
      // =================================================================
      // Shadows — Brand
      // =================================================================
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(26, 143, 168, 0.15)',
        'brand-lg': '0 10px 25px -3px rgba(26, 143, 168, 0.2)',
        'brand-hover': '0 6px 20px 0 rgba(26, 143, 168, 0.25)',
        'teal': '0 4px 14px rgba(26, 143, 168, 0.2)',
        'teal-lg': '0 8px 24px rgba(26, 143, 168, 0.25)',
        'gold': '0 4px 14px rgba(240, 165, 0, 0.2)',
        'coral': '0 4px 14px rgba(232, 116, 97, 0.2)',
        
        'clinical-urgent': '0 0 0 3px rgba(239, 68, 68, 0.3)',
        'clinical-warning': '0 0 0 3px rgba(240, 165, 0, 0.3)',
        'clinical-success': '0 0 0 3px rgba(16, 185, 129, 0.3)',
        'clinical-info': '0 0 0 3px rgba(26, 143, 168, 0.3)',
        
        'card-sm': '0 1px 3px rgba(12, 53, 71, 0.06)',
        'card-md': '0 4px 12px rgba(12, 53, 71, 0.08)',
        'card-lg': '0 8px 24px rgba(12, 53, 71, 0.12)',
        'card-hover': '0 12px 32px rgba(12, 53, 71, 0.15)',
      },
      
      borderRadius: {
        'clinical-sm': '8px',
        'clinical-md': '12px',
        'clinical-lg': '16px',
        'clinical-xl': '24px',
      },
      
      fontSize: {
        'clinical-xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'clinical-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        'clinical-base': ['1rem', { lineHeight: '1.5rem' }],
        'clinical-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'clinical-xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-urgent': 'pulse-urgent 1.5s ease-in-out infinite',
        'pulse-teal': 'pulse-teal 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-urgent': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '50%': { opacity: '0.9', boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' },
        },
        'pulse-teal': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      
      zIndex: {
        'dropdown': '50',
        'sticky': '100',
        'fixed': '200',
        'modal-backdrop': '300',
        'modal': '400',
        'popover': '500',
        'tooltip': '600',
        'toast': '700',
      },
    },
  },
  plugins: [],
}
