import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/announcements
 * アクティブなアナウンスを取得（認証不要）
 */
export async function GET() {
  try {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      orderBy: [
        { level: "desc" }, // critical > warning > info
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        titleJa: true,
        message: true,
        messageJa: true,
        level: true,
        startAt: true,
        endAt: true,
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 },
    );
  }
}
