/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        '50': '10.5rem',   // ahora puedes usar bottom-50 (168px)
        '54': '13.5rem',   // por si usas bottom-54 también
        '28': '7rem',      // útil si necesitas otras separaciones exactas
        '44': '11rem'      // 176px para mejor espaciado en móviles
      }
    },
  },
  plugins: [],
};
