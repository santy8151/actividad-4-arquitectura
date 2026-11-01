export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#102A43',
          700: '#2563EB',
          600: '#0F9D91',
          50: '#F4F7FB',
          warning: '#F59E0B',
          danger: '#DC2626'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(16,42,67,0.08)'
      }
    }
  },
  plugins: []
};
