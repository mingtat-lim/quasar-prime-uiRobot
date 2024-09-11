// import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
    // { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    // ...tseslint.configs.recommended,

    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        ignores: ['dist/**/*', 'eslint.config.mjs', 'prettier.config.mjs'],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];
