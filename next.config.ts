import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/gymmaster/:path*",
        destination: "https://parclub247.gymmasteronline.com/portal/api/:path*",
      },
    ];
  },
};

export default nextConfig;
