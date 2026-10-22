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
    const defaultBackendUrl = process.env.NODE_ENV === 'production'
      ? 'https://api-marc.onrender.com/api'
      : 'http://localhost:5000/api';
    const backendUrl = (process.env.BACKEND_API_URL?.trim() || defaultBackendUrl).replace(/\/$/, "");
    if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(backendUrl).hostname)) {
      throw new Error('BACKEND_API_URL must point to the public backend in production, such as https://api-marc.onrender.com/api.');
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
