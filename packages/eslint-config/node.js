import globals from "globals";
import baseConfig from "./index.js";
import tseslint from "typescript-eslint";

/** @type {import("typescript-eslint").Config} */
const config = tseslint.config(...baseConfig, {
    languageOptions: {
        globals: {
            ...globals.node,
        },
    },
});

export default config;
