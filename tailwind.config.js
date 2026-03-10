/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy — keep for backward compat with existing components
        brand: 'var(--color-brand)',
        'brand-opacity': 'var(--color-brand-opacity)',

        // Surfaces
        canvas:          'var(--canvas)',
        surface:         'var(--surface)',
        'surface-raised':'var(--surface-raised)',
        'surface-inset': 'var(--surface-inset)',

        // Sidebar
        sidebar:         'var(--sidebar-bg)',

        // Text hierarchy
        'ink-1': 'var(--ink-1)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        'ink-4': 'var(--ink-4)',

        // Borders
        'line-1': 'var(--line-1)',
        'line-2': 'var(--line-2)',
        'line-3': 'var(--line-3)',

        // Accent
        accent:         'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-subtle':'var(--accent-subtle)',
        'accent-fg':    'var(--accent-fg)',

        // Semantic
        ok:   'var(--ok)',
        warn: 'var(--warn)',
        risk: 'var(--risk)',
      },
    },
  },
  plugins: [],
}
