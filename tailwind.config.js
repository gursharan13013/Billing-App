/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--brand-primary, #6366F1)',
        'money-in': 'var(--money-in, #10B981)',
        'money-out': 'var(--money-out, #6366F1)',
        'money-warn': 'var(--money-warn, #F59E0B)',
        'bg-app': 'var(--bg-app, #F8FAFC)',
        'bg-card': 'var(--bg-card, #FFFFFF)',
        'text-main': 'var(--text-main, #0F172A)',
        'border-ui': 'var(--border-ui, #E2E8F0)',
        'app-bg': 'var(--bg-app, #F8FAFC)',
      },
    },
  },
  plugins: [],
}

