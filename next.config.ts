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
  // リライト設定
  async rewrites() {
    const ragBackendUrl =
      process.env.RAG_BACKEND_URL || "http://localhost:8000";

    return [
      // /uploads/profiles/* を /api/uploads/profiles/* にリライト
      {
        source: "/uploads/profiles/:path*",
        destination: "/api/uploads/profiles/:path*",
      },
      // RAG Backend APIプロキシ
      {
        source: "/api/rag-backend/:path*",
        destination: `${ragBackendUrl}/api/:path*`,
      },
      // RAG Backend ヘルスチェック
      {
        source: "/api/rag-backend-health",
        destination: `${ragBackendUrl}/health`,
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
