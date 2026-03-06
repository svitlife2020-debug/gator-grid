import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fonts.gstatic.com" },
      { protocol: "https", hostname: "cmsv2-assets.apptegy.net" },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
















