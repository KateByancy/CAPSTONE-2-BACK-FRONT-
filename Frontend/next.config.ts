import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Referrer-Policy', value: process.env.NODE_ENV === 'development' ? 'no-referrer-when-downgrade' : 'strict-origin-when-cross-origin' },
      ],
    }];
  },
  async rewrites() {
    const backendUrl = (process.env.BACKEND_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
