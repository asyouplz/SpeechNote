module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint', 'unused-imports'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    ignorePatterns: ['main.js', 'main.js.map', 'node_modules/', 'dist/'],
    rules: {
        // Prefer unused-imports plugin for removals
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'error',
            { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_', ignoreRestSiblings: true }
        ],
        '@typescript-eslint/ban-types': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/no-inferrable-types': 'warn',
        'no-case-declarations': 'off'
    }
};
