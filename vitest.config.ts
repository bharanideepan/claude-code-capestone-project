import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        '__tests__/**',
        'prisma/**',
        '.next/**',
        'app/layout.tsx',
        'app/page.tsx',
        'app/(auth)/**',
        'app/(dashboard)/**',
        'app/globals.css',
        'next.config.ts',
        'vitest.config.ts',
        'postcss.config.mjs',
        'eslint.config.mjs',
        'tailwind.config.ts',
        'middleware.ts',
        'proxy.ts',
        'components/**',
        'hooks/**',
        'lib/config.ts',
        'lib/server-session.ts',
        'lib/session-cookie.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
