import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker/Kubernetes
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      buildId: process.env.NEXT_BUILD_ID || "dev",
    },
    { status: 200 },
  );
}
