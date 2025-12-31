import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/announcements
 * 全アナウンスを取得（管理者のみ）
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/announcements
 * 新規アナウンスを作成（管理者のみ）
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, titleJa, message, messageJa, level, startAt, endAt } = body;

    // 日本語が必須、英語は任意
    if (!titleJa || !messageJa) {
      return NextResponse.json(
        { error: "Title and message (Japanese) are required" },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title || titleJa, // 英語がない場合は日本語をフォールバック
        titleJa,
        message: message || messageJa, // 英語がない場合は日本語をフォールバック
        messageJa,
        level: level || "info",
        startAt: startAt ? new Date(startAt) : new Date(),
        endAt: endAt ? new Date(endAt) : null,
        createdBy: session.user.id,
      },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ANNOUNCEMENT_CREATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: announcement.id,
      targetType: "Announcement",
      details: { title, level },
    }).catch(() => {});

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
