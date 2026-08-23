import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#00b2fc',
          600: '#008cfb',
          700: '#0072f9',
          800: '#005ae0',
          900: '#0648b8',
          DEFAULT: '#00b2fc',
          fg: '#ffffff',
        },
      },
      boxShadow: {
        soft: '0 1px 3px rgba(16,24,40,0.04), 0 10px 28px -10px rgba(16,24,40,0.10)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 16px 40px -16px rgba(16,24,40,0.14)',
        glow: '0 10px 40px -10px rgba(0,178,252,0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.16,1,0.3,1) infinite',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg,#00e0fc 0%,#00b2fc 50%,#0072f9 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
