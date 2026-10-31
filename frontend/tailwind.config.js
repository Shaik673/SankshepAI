/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary dark palette
        navy: {
          950: '#030712',
          900: '#0a0f1e',
          800: '#0d1530',
          700: '#111d45',
          600: '#162155',
        },
        graphite: {
          900: '#111318',
          800: '#1a1d24',
          700: '#22262f',
          600: '#2a2f3a',
          500: '#363c47',
          400: '#4a5163',
        },
        indigo: {
          950: '#1e1b4b',
          900: '#312e81',
          800: '#3730a3',
          700: '#4338ca',
          600: '#4f46e5',
          500: '#6366f1',
          400: '#818cf8',
          300: '#a5b4fc',
          200: '#c7d2fe',
          100: '#e0e7ff',
        },
        // Accent palette
        cyan: {
          DEFAULT: '#06b6d4',
          light: '#22d3ee',
          dark: '#0891b2',
          glow: 'rgba(6,182,212,0.15)',
        },
        electric: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
          glow: 'rgba(59,130,246,0.15)',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
          glow: 'rgba(139,92,246,0.15)',
        },
        emerald: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        amber: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        rose: {
          DEFAULT: '#f43f5e',
          light: '#fb7185',
          dark: '#e11d48',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #0a0f1e 0%, #111d45 50%, #0d1530 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'glow-gradient': 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)',
        'hero-gradient': 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.2) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.15) 0%, transparent 50%)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(6,182,212,0.1)',
        'glow-indigo': '0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1)',
        'glow-violet': '0 0 20px rgba(139,92,246,0.3), 0 0 40px rgba(139,92,246,0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'progress': 'progress 1.5s ease-in-out infinite',
        'typewriter': 'typewriter 3s steps(40) forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: 0, transform: 'translateY(-16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
