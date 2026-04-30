import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next.js doesn't pick up a stray lockfile
  // higher up the directory tree (e.g. C:\Users\synte\package-lock.json).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
