import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // sharp is a native module used only server-side for image resizing.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
