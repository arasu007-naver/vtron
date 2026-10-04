import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "_ds/**",
      "_template/**",
      "*.dc.html",
      "deck-stage.js",
      "ds-base.js",
      "image-slot.js",
      "support.js",
      // 의류 비전 추출 엔진 스냅샷 — 원본(SHA-256 매니페스트)과 동일하게 유지하므로 린트하지 않는다
      "lib/style-ex/engine/**",
      "lib/style-ex/scoring/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
