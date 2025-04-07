import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/gymmaster/:path*",
        destination: "https://parclub247.gymmasteronline.com/portal/api/:path*",
      },
      {
        source: "/api/gatekeeper/:path*",
        destination:
          "https://parclub247.gymmasteronline.com/gatekeeper_api/v2/:path*",
      },
    ];
  },
};

export default nextConfig;
