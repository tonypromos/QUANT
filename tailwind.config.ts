import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg) / <alpha-value>)',
        panel: 'hsl(var(--panel) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        ink: 'hsl(var(--ink) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(255 255 255 / 0.07), 0 12px 32px rgb(0 0 0 / 0.45)'
      },
      borderRadius: {
        xl: '1rem'
      }
    }
  },
  plugins: []
};

export default config;
