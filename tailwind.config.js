/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#7C3AED',
            50: '#F3E8FF',
            100: '#E9D5FF',
            200: '#D8B4FE',
            300: '#C084FC',
            400: '#A855F7',
            500: '#9333EA',
            600: '#7E22CE',
            700: '#6B21A8',
            800: '#581C87',
            900: '#3B0764',
          },
          surface: {
            DEFAULT: '#FFFFFF',
            muted: '#F1F5F9',
            subtle: '#EBE7FF',
            page: '#F8F9FF',
          },
          border: '#E5E7EB',
          text: {
            base: '#0F172A',
            muted: '#64748B',
            secondary: '#475569',
            inverse: '#FFFFFF',
          },
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#2563EB',
        },
        spacing: {
          sidebar: '280px',
        },
        fontFamily: {
          primary: ['Vazirmatn', 'Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
          mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        },
        fontSize: {
          h1: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
          h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
          h3: ['18px', { lineHeight: '1.4', fontWeight: '600' }],
          'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
          body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
          'body-sm': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
          caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        },
        borderRadius: {
          sm: '10px',
          md: '14px',
          lg: '20px',
          xl: '28px',
        },
        boxShadow: {
          card: '0 10px 30px rgba(79, 70, 229, 0.08)',
          'card-soft': '0 20px 45px rgba(148, 163, 254, 0.18)',
          'glow-primary': '0 0 40px rgba(124, 58, 237, 0.25)',
        },
        transitionDuration: {
          standard: '200ms',
        },
        transitionTimingFunction: {
          standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
  plugins: [],
};
