import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Next.js's in-page dev devtools panel — it throws
  // `Failed to execute 'releasePointerCapture'` errors from its own
  // pointer-event handlers (next-devtools/index_*.js). Pure dev-only.
  devIndicators: false,
};

export default nextConfig;
