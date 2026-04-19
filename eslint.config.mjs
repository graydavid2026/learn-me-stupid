import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'server/uploads/**',
      'tmp/**',
      'data/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      'postcss.config.js',
      'tailwind.config.js',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (type-unaware -- no project needed)
  ...tseslint.configs.recommended,

  // Server files: Node.js globals
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
  },

  // Service worker (browser + service-worker globals)
  {
    files: ['client/public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        clients: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Notification: 'readonly',
      },
    },
  },

  // Client files: browser globals
  {
    files: ['client/**/*.ts', 'client/**/*.tsx'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLAudioElement: 'readonly',
        HTMLVideoElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        DragEvent: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        MediaRecorder: 'readonly',
        speechSynthesis: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        location: 'readonly',
        history: 'readonly',
        CustomEvent: 'readonly',
        ClipboardEvent: 'readonly',
        DataTransfer: 'readonly',
      },
    },
  },

  // Project-wide rule overrides
  {
    rules: {
      // Allow unused vars prefixed with _ (common convention for intentionally unused params)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Allow explicit any in specific cases (gradually reduce over time)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow require() in config files and legacy code
      '@typescript-eslint/no-require-imports': 'off',
      // Allow empty catch blocks with a comment or underscore-named param
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Files we cannot modify: relax all rules
  {
    files: [
      'server/routes/study.ts',
      'server/services/srEngine.ts',
      'client/src/components/study/StudyView.tsx',
      'client/src/components/dashboard/DashboardView.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
      'no-useless-assignment': 'off',
    },
  },

  // Test files: relax typing rules
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
