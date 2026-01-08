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
        // Brand Colors - ATTENDING AI Primary Palette
        // =================================================================
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',  // Primary brand color
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
          // Legacy gradient endpoints
          primary: '#667eea',
          secondary: '#764ba2',
        },
        
        // =================================================================
        // Clinical Status Colors - Healthcare-specific palette
        // =================================================================
        clinical: {
          // Urgency/Priority Levels
          urgent: '#ef4444',        // Red - Critical, STAT
          'urgent-bg': '#fef2f2',
          warning: '#f59e0b',       // Amber - ASAP, Caution
          'warning-bg': '#fffbeb',
          success: '#10b981',       // Green - Normal, Stable
          'success-bg': '#ecfdf5',
          info: '#3b82f6',          // Blue - Routine, Info
          'info-bg': '#eff6ff',
          
          // Triage Colors (aligned with medical standards)
          triage: {
            resuscitation: '#dc2626', // Red - Immediate
            emergent: '#f97316',       // Orange - Emergent
            urgent: '#fbbf24',         // Yellow - Urgent
            'less-urgent': '#22c55e',  // Green - Less Urgent
            'non-urgent': '#3b82f6',   // Blue - Non-Urgent
          },
          
          // Lab Result Status
          normal: '#16a34a',
          abnormal: '#ea580c',
          critical: '#dc2626',
          pending: '#6b7280',
          
          // AI Confidence Levels
          ai: {
            high: '#8b5cf6',      // Purple - High confidence
            medium: '#6366f1',    // Indigo - Medium confidence
            low: '#a1a1aa',       // Gray - Low confidence
          },
        },

        // =================================================================
        // Extended Color Palettes
        // =================================================================
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      
      // =================================================================
      // Gradients - Brand and Clinical
      // =================================================================
      backgroundImage: {
        // Brand Gradients
        'brand-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'brand-gradient-alt': 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, #faf5ff 0%, #eef2ff 100%)',
        'brand-gradient-dark': 'linear-gradient(135deg, #581c87 0%, #312e81 100%)',
        
        // Clinical Gradients
        'clinical-urgent': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        'clinical-warning': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'clinical-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'clinical-info': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        
        // Feature Gradients
        'labs-gradient': 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
        'imaging-gradient': 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        'meds-gradient': 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
        'ai-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      },
      
      // =================================================================
      // Shadows - Clinical UI specific
      // =================================================================
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(139, 92, 246, 0.15)',
        'brand-lg': '0 10px 25px -3px rgba(139, 92, 246, 0.2)',
        'brand-hover': '0 6px 20px 0 rgba(139, 92, 246, 0.25)',
        
        // Clinical status shadows (for hover/focus states)
        'clinical-urgent': '0 0 0 3px rgba(239, 68, 68, 0.3)',
        'clinical-warning': '0 0 0 3px rgba(245, 158, 11, 0.3)',
        'clinical-success': '0 0 0 3px rgba(16, 185, 129, 0.3)',
        'clinical-info': '0 0 0 3px rgba(59, 130, 246, 0.3)',
        
        // Card shadows
        'card-sm': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'card-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'card-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'card-hover': '0 12px 32px rgba(0, 0, 0, 0.15)',
      },
      
      // =================================================================
      // Border Radius - Clinical design tokens
      // =================================================================
      borderRadius: {
        'clinical-sm': '8px',
        'clinical-md': '12px',
        'clinical-lg': '16px',
        'clinical-xl': '24px',
      },
      
      // =================================================================
      // Typography - Healthcare optimized
      // =================================================================
      fontSize: {
        'clinical-xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'clinical-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        'clinical-base': ['1rem', { lineHeight: '1.5rem' }],
        'clinical-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'clinical-xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      
      // =================================================================
      // Spacing - Consistent clinical UI spacing
      // =================================================================
      spacing: {
        'clinical-xs': '0.25rem',   // 4px
        'clinical-sm': '0.5rem',    // 8px
        'clinical-md': '1rem',      // 16px
        'clinical-lg': '1.5rem',    // 24px
        'clinical-xl': '2rem',      // 32px
        'clinical-2xl': '3rem',     // 48px
      },
      
      // =================================================================
      // Animations - Subtle, professional
      // =================================================================
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-urgent': 'pulse-urgent 1.5s ease-in-out infinite',
        'pulse-purple': 'pulse-purple 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-urgent': {
          '0%, 100%': { 
            opacity: '1',
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)',
          },
          '50%': { 
            opacity: '0.9',
            boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)',
          },
        },
        'pulse-purple': {
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
      
      // =================================================================
      // Z-Index - Layering system
      // =================================================================
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
