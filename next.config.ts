import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qtrypzzcjebvfcihiynt.supabase.co",
      },
    ],
  },
};

export default nextConfig;