import next from "eslint-config-next";

const nextConfig = [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "lib/db/migrations/**",
      "notebooks/**",
    ],
  },
  {
    // React 19's hook plugin warns on legitimate hydration patterns
    // (reading from localStorage / fetching auth context in useEffect and
    // updating state). Our usage is intentional — without these rules off,
    // every BYOK component flags.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default nextConfig;
