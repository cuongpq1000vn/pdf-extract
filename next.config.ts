import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist loads its own worker module at runtime; bundling it breaks that.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
