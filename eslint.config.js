import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  // 🎯 面试考点：ESLint 9 flat config —— 用数组替代旧的 .eslintrc
  // 每项可覆盖 parser、plugins、rules、ignores 等，从上到下合并
  { ignores: ['dist/**', 'node_modules/**', '.eslintrc.cjs', 'src/assets/**', 'server/**', 'miniprogram/**', 'shared/**/*.test.ts'] },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // react-hooks 官方 flat config（v5+ 支持）
  reactHooks.configs.flat['recommended-latest'],

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // 根目录构建配置文件不在 tsconfig include 内，无需 type-aware linting
    files: ['*.config.ts', '*.config.js'],
    languageOptions: {
      parserOptions: { projectService: false },
    },
  },
  {
    // 测试里要构造 axios 这类外部库的假实例，mock 对象天然放弃精确类型
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
)
