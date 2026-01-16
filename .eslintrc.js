// ============================================================
// ESLint Configuration - ATTENDING AI Platform
// Root configuration for the monorepo
// ============================================================

module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'coverage/',
    '*.min.js',
  ],
  overrides: [
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        // TypeScript specific rules
        '@typescript-eslint/no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        
        // Prevent importing from local duplicates - use @attending/shared instead
        // Using explicit paths instead of glob patterns to avoid false positives
        'no-restricted-imports': ['error', {
          patterns: [
            {
              // Block local lib/prisma imports (relative paths and @/ alias)
              group: [
                '@/lib/prisma',
                './lib/prisma',
                '../lib/prisma',
                '../../lib/prisma',
                '../../../lib/prisma',
              ],
              message: 'Import prisma from @attending/shared/lib/prisma instead of local lib/prisma',
            },
            {
              // Block local lib/utils imports (relative paths and @/ alias)  
              group: [
                '@/lib/utils',
                './lib/utils',
                '../lib/utils',
                '../../lib/utils',
                '../../../lib/utils',
              ],
              message: 'Import utils from @attending/shared/lib/utils instead of local lib/utils',
            },
          ],
        }],
      },
    },
    // React/Next.js files
    {
      files: ['apps/**/*.tsx', 'apps/**/*.ts'],
      extends: ['next/core-web-vitals'],
      rules: {
        // React specific rules
        'react/no-unescaped-entities': 'off',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
  ],
};
