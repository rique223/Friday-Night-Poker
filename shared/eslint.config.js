import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

export default [
    { ignores: ['dist/**', 'node_modules/**'] },

    js.configs.recommended,

    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
            globals: { ...globals.node },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'simple-import-sort': simpleImportSort,
            prettier,
        },
        rules: {
            // `tsc` covers both of these, and neither base rule understands TypeScript's
            // separate value and type namespaces — the same class of false positive that
            // made `no-undef` report "'React' is not defined" on the client (Q98). Here it
            // is the zod idiom of `export const Foo = z.object(…)` beside
            // `export type Foo = z.infer<typeof Foo>`, which is deliberate.
            'no-undef': 'off',
            // `export const Foo = z.object(…)` beside `export type Foo = z.infer<typeof Foo>`
            // is the whole point of this package: one name usable as both a validator and a
            // type. TypeScript allows it (separate value and type namespaces) and rejects a
            // genuine redeclaration on its own, but neither the base rule nor the
            // TypeScript one whitelists the const + type-alias pairing.
            'no-redeclare': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            'prettier/prettier': 'error',
        },
    },

    prettierConfig,
];
