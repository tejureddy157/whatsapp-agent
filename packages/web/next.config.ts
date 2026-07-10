import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly — an unrelated package-lock.json in
  // the user's home directory otherwise confuses Next.js's auto-detection.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
