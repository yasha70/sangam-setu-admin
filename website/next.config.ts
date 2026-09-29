import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf ships its own font engine and must run as a plain Node package
  serverExternalPackages: ["@react-pdf/renderer"],
  // The PDF route reads font files from node_modules at runtime
  outputFileTracingIncludes: {
    "/api/pdf": [
      "./node_modules/@fontsource/inter/files/inter-latin-*.woff",
      "./node_modules/@fontsource/playfair-display/files/playfair-display-latin-*.woff",
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
