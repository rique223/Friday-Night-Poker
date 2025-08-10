import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import js from '@eslint/js';

export default [
    // Global ignores
    {
        ignores: [
            'node_modules/**',
            'data/**',
            '*.db',
            '*.sqlite',
            '*.sqlite3',
            'coverage/**',
            'dist/**',
        ],
    },

    // Base configuration
    js.configs.recommended,

    // Main configuration for all JS files
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
        plugins: {
            import: importPlugin,
            'simple-import-sort': simpleImportSort,
            prettier,
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.json'],
                },
            },
        },
        rules: {
            // Import sorting and organization
            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        // Side effect imports first
                        ['^\\u0000'],
                        // Node.js builtins
                        [
                            '^(assert|buffer|child_process|cluster|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)',
                        ],
                        // External packages
                        ['^[a-z]', '^@[a-z]'],
                        // Internal packages/modules
                        ['^#', '^@/', '^~/'],
                        // Parent imports
                        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                        // Other relative imports
                        ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',

            // Import rules
            'import/first': 'error',
            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',
            'import/no-cycle': 'error',
            'import/no-self-import': 'error',
            'import/extensions': ['error', 'ignorePackages'],

            // General JavaScript rules
            'no-console': 'off', // Console logging is common in Node.js
            'no-debugger': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-template': 'error',
            'template-curly-spacing': 'error',
            'arrow-spacing': 'error',
            'comma-dangle': ['error', 'always-multiline'],
            semi: ['error', 'always'],
            quotes: ['error', 'single', { avoidEscape: true }],
            'no-trailing-spaces': 'error',
            'eol-last': 'error',
            'space-before-function-paren': ['error', { anonymous: 'always', named: 'never' }],

            // Error handling
            'no-throw-literal': 'error',
            'prefer-promise-reject-errors': 'error',

            // Security
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',

            // Best practices
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
            'no-else-return': 'error',
            'no-useless-return': 'error',
            'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'computed-property-spacing': ['error', 'never'],

            // Prettier integration
            'prettier/prettier': 'error',
        },
    },

    // Configuration files can have more relaxed rules
    {
        files: ['**/*.config.js', '**/eslint.config.js'],
        rules: {
            'no-console': 'off',
            'import/no-extraneous-dependencies': 'off',
        },
    },

    // Apply prettier config last to override formatting rules
    prettierConfig,
];
