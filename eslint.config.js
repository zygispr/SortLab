import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { boundaries } from './eslint.boundaries.js';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'specs/',
      '.specify/',
      '.claude/',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', '*.config.ts'],
    extends: [...tseslint.configs.strictTypeChecked, reactHooks.configs.flat.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // tsconfig enables noUncheckedIndexedAccess, so every array and typed-array read is
      // typed `T | undefined`. The sorting and playback hot paths index arrays whose bounds
      // they have already checked; `!` states that, without a runtime cost per access.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  ...boundaries,
);
