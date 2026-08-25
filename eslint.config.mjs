import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...next,
  ...nextCoreWebVitals,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/no-create-components-during-render": "off",
      "react-hooks/immutability": "off",
      "react-hooks/no-use-before-define": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default eslintConfig;
