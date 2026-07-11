/**
 * ESLint Configuration (모노레포 공통)
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "lint와 typecheck가 CI에서 자동으로 통과해야 합니다."
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: [
      './engines/*/tsconfig.json',
      './packages/*/tsconfig.json',
      './tools/*/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // 맨 마지막 (충돌 방지)
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/*.d.ts',
    '.github/**',
  ],
  rules: {
    // TypeScript 권장
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',

    // Platform 헌법 준수
    'no-console': ['warn', { allow: ['warn', 'error'] }], // logger 사용 권장
    'no-throw-literal': 'error', // throw new Error(...) 강제
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
  },
  overrides: [
    {
      // 테스트 파일은 더 느슨 규칙
      files: ['**/test/**', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
