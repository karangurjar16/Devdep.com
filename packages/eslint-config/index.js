import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import("typescript-eslint").Config} */
const config = tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "no-console": "off",
        },
    }
);

export default config;
