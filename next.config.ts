import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Google Fonts and any external logo images from sponsors
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fonts.gstatic.com",
      },
      // Add sponsor logo domains here if you serve them from a CDN, e.g.:
      // { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // Silence the "x-powered-by" header (minor security hardening)
  poweredByHeader: false,

  // Strict mode catches subtle React bugs during development
  reactStrictMode: true,
};

export default nextConfig;
