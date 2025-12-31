import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker用のstandaloneビルド出力
  output: "standalone",

  // Server-side only packages (Node.js native modules)
  serverExternalPackages: ["ldapts"],

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // /uploads/profiles/* を /api/uploads/profiles/* にリライト
  async rewrites() {
    return [
      {
        source: "/uploads/profiles/:path*",
        destination: "/api/uploads/profiles/:path*",
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.externals.push("@node-rs/argon2", "@node-rs/bcrypt");

    // ldapts uses Node.js native modules - let Node.js resolve it from node_modules
    if (isServer) {
      config.externals.push("ldapts");
    }

    // Docker開発環境でのホットリロード対応
    if (process.env.NODE_ENV === "development" && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
};

export default nextConfig;
