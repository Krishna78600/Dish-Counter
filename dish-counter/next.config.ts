import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static export for Firebase Hosting
  reactCompiler: true,
  distDir: 'out',    // Optional: Specify the output directory for static files
};

export default nextConfig;
