import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'node_modules/**', 'data/**'],
    },

    js.configs.recommended,

    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: { ...globals.node, ...globals.es2021 },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            import: importPlugin,
            'simple-import-sort': simpleImportSort,
            prettier,
        },
        settings: {
            'import/resolver': {
                typescript: { project: './tsconfig.json' },
            },
        },
        rules: {
            // `tsc` already reports undefined identifiers, and `no-undef` does not
            // understand type-only namespaces, so it only ever produced false positives.
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
            '@typescript-eslint/no-floating-promises': 'error',

            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        ['^\\u0000'],
                        ['^node:'],
                        ['^[a-z]', '^@[a-z]'],
                        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                        ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',
            'import/first': 'error',
            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',
            'import/no-cycle': 'error',
            'import/no-self-import': 'error',

            'no-console': 'off',
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
            'no-throw-literal': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],

            'prettier/prettier': 'error',
        },
    },

    prettierConfig,
];
