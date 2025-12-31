import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/announcements/[id]
 * 特定のアナウンスを取得（管理者のみ）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
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

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/announcements/[id]
 * アナウンスを更新（管理者のみ）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, titleJa, message, messageJa, level, isActive, startAt, endAt } =
      body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleJa !== undefined && { titleJa }),
        ...(message !== undefined && { message }),
        ...(messageJa !== undefined && { messageJa }),
        ...(level !== undefined && { level }),
        ...(isActive !== undefined && { isActive }),
        ...(startAt !== undefined && { startAt: new Date(startAt) }),
        ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
      },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ANNOUNCEMENT_UPDATE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: id,
      targetType: "Announcement",
      details: { title: announcement.title, isActive: announcement.isActive },
    }).catch(() => {});

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/announcements/[id]
 * アナウンスを削除（管理者のみ）
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    await prisma.announcement.delete({
      where: { id },
    });

    // 監査ログに記録
    await AuditService.log({
      action: "ANNOUNCEMENT_DELETE",
      category: "SYSTEM_SETTING",
      userId: session.user.id,
      targetId: id,
      targetType: "Announcement",
      details: { title: announcement.title },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
