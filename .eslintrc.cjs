module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    env: {
        browser: true,
        es2020: true,
    },
    plugins: [
        'react',
        'react-hooks',
        '@typescript-eslint',
        'react-refresh'
    ],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        // React Refresh
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

        // React Hooks
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // ✅ Отключение устаревших/ненужных правил
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
    },
};

