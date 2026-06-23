/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#16313F', light: '#234357', deep: '#102530' },
        gold: { DEFAULT: '#B8862F', light: '#D8A94F', soft: '#EBD9B4' },
        cream: '#FAF7F1',
        paper: '#FFFFFF',
        ink: '#1C2024',
        muted: '#6B6F66',
        line: '#E4DED0',
        good: { DEFAULT: '#2F6F4E', bg: '#E7F1EA' },
        damaged: { DEFAULT: '#A8392E', bg: '#F7E7E4' },
        pending: { DEFAULT: '#B5811E', bg: '#FAF0DA' },
        extra: { DEFAULT: '#5B5BA6', bg: '#ECEAF7' },
        scrap: { DEFAULT: '#6B6B6B', bg: '#EAEAEA' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '1.3'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,49,63,0.05), 0 4px 14px rgba(22,49,63,0.05)',
        'card-hover': '0 2px 4px rgba(22,49,63,0.07), 0 12px 28px rgba(22,49,63,0.12)',
        modal: '0 20px 60px rgba(16,37,48,0.35)',
        pop: '0 6px 20px rgba(22,49,63,0.18)',
        'gold-glow': '0 4px 16px rgba(184,134,47,0.30)',
      },
      maxWidth: {
        app: '960px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out both',
        'fade-in-up': 'fade-in-up .3s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in .2s cubic-bezier(0.22,1,0.36,1) both',
        'sheet-up': 'sheet-up .3s cubic-bezier(0.22,1,0.36,1) both',
        'bar-grow': 'bar-grow .6s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};
