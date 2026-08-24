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
    rules: {
      // Flags the standard "fetch on mount" effect pattern
      // (useEffect(() => { load() }, [])) as an error. That pattern is
      // correct React, not a bug, so this stays a warning rather than
      // forcing every data-fetching page to restructure around it.
      'react-hooks/set-state-in-effect': 'warn',
      // Context files exporting both a Provider component and a
      // `useX()` hook (the standard React context pattern used here in
      // AuthContext/BrandContext) only costs a little Fast Refresh
      // granularity in dev — not worth splitting into extra files for.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
