/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite-react/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        systemGray6: "rgb(28,28,30)",
        systemGray5: "rgb(44,44,46)",
        systemGray4: "rgb(58,58,60)",
        systemGray3: "rgb(72,72,74)",
        systemGray2: "rgb(99,99,102)",
        systemGray: "rgb(142,142,147)",
      },
    },
  },
  plugins: [require("flowbite/plugin")],
};
