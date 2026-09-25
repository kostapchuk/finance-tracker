import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'e2e']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      unicorn.configs['flat/recommended'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'jsx-a11y/no-autofocus': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'import/no-duplicates': 'error',
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['useServiceWorker', 'buttonVariants', 'badgeVariants'],
        },
      ],
    },
  },
  {
    files: [
      '**/components/ui/alert.tsx',
      '**/components/ui/card.tsx',
      '**/components/ui/dialog.tsx',
    ],
    rules: {
      'jsx-a11y/heading-has-content': 'off',
    },
  },
  {
    files: ['**/components/ui/label.tsx'],
    rules: {
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
  {
    files: ['**/components/ui/CategoryTile.tsx', '**/components/ui/AccountCard.tsx'],
    rules: {
      'react-hooks/static-components': 'off',
    },
  },
  {
    // Dexie's `.stores()` schema migrations require the literal `null` (not
    // `undefined`) to mark a table for deletion between versions.
    files: ['**/database/db.ts'],
    rules: {
      'unicorn/no-null': 'off',
    },
  },
  {
    // The `Storage` web API (implemented here for tests) requires returning
    // the literal `null`, not `undefined`, from `getItem`/`key`.
    files: ['**/test/setup.ts'],
    rules: {
      'unicorn/no-null': 'off',
    },
  },
  {
    // `.reverse()` here is Dexie's `Collection#reverse()` (flips query cursor
    // direction), not `Array#reverse()` - there is no `Collection#toReversed()`.
    files: ['**/database/repositories.ts'],
    rules: {
      'unicorn/no-array-reverse': 'off',
    },
  },
])
