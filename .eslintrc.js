// ============================================================
// ESLint Configuration - ATTENDING AI Platform
// Root configuration for the monorepo
// 
// Updated with stricter rules to catch type mismatches and
// ensure consistent patterns across the codebase.
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
    '.turbo/',
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
        // ============================================================
        // TypeScript Rules - Stricter enforcement
        // ============================================================
        
        // Unused variables should be warnings to allow iterative development
        '@typescript-eslint/no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        }],
        
        // Allow explicit any for healthcare data complexity
        '@typescript-eslint/no-explicit-any': 'off',
        
        // Allow non-null assertions where we know data exists
        '@typescript-eslint/no-non-null-assertion': 'off',
        
        // Don't require explicit return types (Next.js infers them)
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        
        // Prefer type imports for better tree-shaking
        '@typescript-eslint/consistent-type-imports': ['warn', {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
        }],
        
        // Prevent variable shadowing
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'warn',
        
        // ============================================================
        // Import Rules - Ensure consistent imports
        // ============================================================
        
        'no-restricted-imports': ['error', {
          patterns: [
            // Block local lib/prisma imports
            {
              group: [
                '@/lib/prisma',
                './lib/prisma',
                '../lib/prisma',
                '../../lib/prisma',
                '../../../lib/prisma',
              ],
              message: 'Import prisma from @attending/shared/lib/prisma instead of local lib/prisma',
            },
            // Block local lib/utils imports
            {
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
        
        // ============================================================
        // General Best Practices
        // ============================================================
        
        // Allow console during development
        'no-console': 'off',
        
        // Prefer const over let when variable is never reassigned
        'prefer-const': 'warn',
        
        // Enforce consistent brace style for multi-line blocks
        'curly': ['warn', 'multi-line'],
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
    
    // UI Primitives package - stricter for shared components
    {
      files: ['packages/ui-primitives/**/*.ts', 'packages/ui-primitives/**/*.tsx'],
      rules: {
        // Shared components should avoid any where possible
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    
    // Test files - relaxed rules
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};
