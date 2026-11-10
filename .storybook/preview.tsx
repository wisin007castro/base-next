import type { Preview } from '@storybook/nextjs-vite'
import { useEffect } from 'react'
import '../app/globals.css'

/** Tema claro/oscuro desde la barra de Storybook: misma clase `dark` que pone next-themes */
function ThemeDecorator({ theme, children }: { theme: string; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return <div className="min-h-[200px] bg-canvas p-6 text-ink-1">{children}</div>
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Tema',
      toolbar: {
        title: 'Tema',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Claro' },
          { value: 'dark', title: 'Oscuro' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, ctx) => (
      <ThemeDecorator theme={ctx.globals.theme}>
        <Story />
      </ThemeDecorator>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
}

export default preview
