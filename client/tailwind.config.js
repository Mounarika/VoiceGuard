/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4fe',
          100: '#dde7fd',
          200: '#c2d4fb',
          300: '#99baf8',
          400: '#6896f3',
          500: '#4373ed',
          600: '#2c54e0',
          700: '#233fc9',
          800: '#2135a3',
          900: '#1f3080',
        }
      }
    },
  },
  plugins: [],
}
