import sonarjs from "eslint-plugin-sonarjs";

export default [
  sonarjs.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "sonarjs/cognitive-complexity": "warn",
      "sonarjs/no-duplicate-string": "warn"
    }
  }
];
