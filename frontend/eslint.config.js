import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Service worker template — `__PRECACHE_MANIFEST__` is substituted at build time.
    files: ['pwa/service-worker.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, __PRECACHE_MANIFEST__: 'readonly' },
    },
  },
  {
    // Build-time plugin, runs in Node.
    files: ['pwa/vite-plugin-offline.js', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
])
