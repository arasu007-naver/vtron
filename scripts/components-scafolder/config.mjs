const config = {
  project: "vtron",
  scanRoots: ["app", "components", "lib"],
  exclude: [
    "app/api/**",
    "lib/style-ex/scoring/**",
    "**/*.test.*",
    "**/node_modules/**",
  ],
  pathAlias: { "@/": "" },
  transport: {
    "lib/auth-client.ts": ["authFetch", "getAccessToken", "setAccessToken"],
  },
  isUiDir: (file) =>
    (/(^|\/)ui\//.test(file) && file.startsWith("components/")) ||
    /(^|\/)ui\.tsx$/.test(file),
  surface: {
    id: "app",
    label: "vtron 웹 (Next App Router)",
    rootLayout: "app/layout.tsx",
  },
  navLinksFile: "components/nav-links.ts",
  apiRoot: "app/api",
  outFile: "docs/components-scafolder.html",
};

export default config;
