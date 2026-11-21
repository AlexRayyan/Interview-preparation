import type { NextConfig } from "next";

// GitHub Pages serves the site from /<repo-name>/; the deploy workflow sets PAGES_BASE_PATH.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_REPO: process.env.GITHUB_REPOSITORY ?? "" },
};

export default nextConfig;
