import tseslint from 'typescript-eslint';

export default tseslint.config(
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json'
            }
        },
        rules: {
            // Obsidian plugin requirements
            'no-console': ['error', { allow: ['warn', 'error', 'debug'] }],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-useless-escape': 'error'
        },
        ignores: ['main.js', 'node_modules/**', '*.mjs', 'esbuild.config.mjs']
    },
    {
        ignores: ['main.js', 'node_modules/**', '*.mjs', 'esbuild.config.mjs']
    }
);
