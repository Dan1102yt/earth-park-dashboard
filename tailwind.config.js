/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Verde bosque del logo Earth Park (borde circular + texto "Earth Park")
        emerald: {
          50:  '#f2f9eb',
          100: '#e0f1cc',
          200: '#c1e49a',
          300: '#96d05e',
          400: '#6aae35',
          500: '#4d8e1e',
          600: '#3e7218',
          700: '#305812',
          800: '#22400c',
          900: '#162908',
          950: '#0a1404',
        },
        earth: {
          50:  '#f2f9eb',
          100: '#e0f1cc',
          200: '#c1e49a',
          300: '#96d05e',
          400: '#6aae35',
          500: '#4d8e1e',
          600: '#3e7218',
          700: '#305812',
          800: '#22400c',
          900: '#162908',
          950: '#0a1404',
        },
        // Terracota/ladrillo inspirado en las alas superiores de la mariposa
        bark: {
          50:  '#fdf3ef',
          100: '#fbe4da',
          200: '#f6c5b2',
          300: '#ee9d82',
          400: '#e26a4e',
          500: '#c4472a',
          600: '#a0311a',
          700: '#822515',
          800: '#691d11',
          900: '#56180e',
          950: '#2e0b07',
        },
        sky: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
