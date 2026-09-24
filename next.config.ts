import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist loads its own worker module at runtime; bundling it breaks that.
  serverExternalPackages: ["pdfjs-dist"],
  // pdfjs imports the worker dynamically, so the file tracer can't see it and
  // the deployed function fails with "Setting up fake worker failed".
  outputFileTracingIncludes: {
    "/api/extract": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
