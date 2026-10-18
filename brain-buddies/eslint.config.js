// ESLint düz yapılandırması. Hiçbir eklentiye/pakete bağlı değildir; yalnızca ESLint'in
// yerleşik kuralları kullanılır. ESLint proje bağımlılığı değildir (npx eslint . veya global kurulum).

const browser = Object.fromEntries(
  [
    'window', 'document', 'navigator', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'localStorage', 'getComputedStyle',
    'Node', 'Blob', 'URL', 'AudioContext', 'matchMedia', 'console', 'structuredClone',
  ].map((g) => [g, 'readonly']),
);
const node = Object.fromEntries(['process', 'Buffer', 'console', 'URL', 'setTimeout'].map((g) => [g, 'readonly']));

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-unreachable': 'error',
  'no-const-assign': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-constant-condition': ['error', { checkLoops: false }],
  'no-fallthrough': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'no-sparse-arrays': 'error',
  'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'off', // yalnızca testte matematik doğrulaması için kullanılır
  eqeqeq: ['error', 'smart'],
  'prefer-const': 'error',
  'no-var': 'error',
};

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: browser },
    rules: { ...rules, 'no-restricted-properties': ['error', { property: 'innerHTML', message: 'XSS riski: textContent kullan.' }] },
  },
  {
    files: ['tests/**/*.mjs', 'tools/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...node, ...browser } },
    rules,
  },
];
