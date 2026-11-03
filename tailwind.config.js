/** @type {import('tailwindcss').Config} */

/**
 * La misma paleta institucional que la web pública (frontend-web/tailwind.config.ts):
 *   brand-900 #173B65  azul institucional: barra lateral, botones principales, títulos
 *   brand-700 #244F7D  azul secundario: hover
 *   brand-100 #DCE8F1  azul suave: cajas informativas
 *   brand-50  #F2F5F7  gris azulado: fondos
 *   arena     #F4F0E7  avisos y etiquetas suaves
 *   dorado    #B68A52  acentos (en vez del ámbar genérico)
 *   texto     #263746  texto principal
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2F5F7',
          100: '#DCE8F1',
          200: '#BFD3E4',
          300: '#95B4D0',
          400: '#6A92B8',
          500: '#3F6D99',
          600: '#2C5D8F',
          700: '#244F7D',
          800: '#1D4571',
          900: '#173B65',
          950: '#0F2944',
        },
        silver: {
          100: '#F2F5F7',
          200: '#E2E8EE',
          300: '#C9D3DC',
          400: '#A6B4C1',
        },
        arena: '#F4F0E7',
        dorado: {
          DEFAULT: '#B68A52',
          claro: '#DCC19A',
          oscuro: '#8C6A3D',
        },
        texto: '#263746',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 59, 101, 0.04), 0 8px 24px -12px rgba(23, 59, 101, 0.18)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #173B65 0%, #244F7D 100%)',
      },
    },
  },
  plugins: [],
};
