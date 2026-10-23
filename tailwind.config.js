/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2F8FD',
          100: '#E3F0FB',
          200: '#C0DEF5',
          300: '#8FC5ED',
          400: '#56A5E1',
          500: '#2E8BE0',
          600: '#1C6DD0',
          700: '#1452A3',
          800: '#103A7A',
          900: '#0B2545',
          950: '#06162B',
        },
        silver: {
          100: '#F4F6F8',
          200: '#E4E8EC',
          300: '#C9D1D9',
          400: '#A8B3BD',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 37, 69, 0.04), 0 8px 24px -12px rgba(11, 37, 69, 0.18)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0B2545 0%, #1452A3 55%, #2E8BE0 100%)',
      },
    },
  },
  plugins: [],
};
