import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "ffmpeg-static"],
  /* config options here */
};

export default nextConfig;
