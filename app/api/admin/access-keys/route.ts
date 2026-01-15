import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

// Generate random Access key
function generateAccessKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 8;

  const key = Array.from({ length: segments }, () =>
    Array.from(
      { length: segmentLength },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join(""),
  ).join("-");

  return key;
}

// Permission type from frontend
interface PermissionInput {
  granularity: "module" | "menu" | "tab";
  moduleId?: string;
  menuPath?: string;
  tabId?: string;
}

// Create new Access key
export async function POST(request: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, expiresAt, targetUserId, menuPaths, permissions } = body as {
      name: string;
      expiresAt: string;
      targetUserId: string;
      menuPaths: string[];
      permissions?: PermissionInput[];
    };

    if (
      !name ||
      !expiresAt ||
      !targetUserId ||
      !menuPaths ||
      menuPaths.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    const key = generateAccessKey();
    const expiryDate = new Date(expiresAt);

    // トランザクションでAccessKeyとAccessKeyPermissionを作成
    const accessKey = await prisma.$transaction(async (tx) => {
      // AccessKey を作成
      const createdKey = await tx.accessKey.create({
        data: {
          key,
          name,
          targetUserId,
          menuPaths: JSON.stringify(menuPaths), // Store as JSON string (後方互換性)
          expiresAt: expiryDate,
          isActive: true,
          createdBy: session.user.id,
        },
      });

      // permissions 配列がある場合、AccessKeyPermission を作成
      if (permissions && permissions.length > 0) {
        await tx.accessKeyPermission.createMany({
          data: permissions.map((p) => ({
            accessKeyId: createdKey.id,
            granularity: p.granularity,
            moduleId: p.moduleId,
            menuPath: p.menuPath,
            tabId: p.tabId,
          })),
        });
      }

      // 作成したキーを返す（関連データを含む）
      return tx.accessKey.findUnique({
        where: { id: createdKey.id },
        include: {
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          permissions: true,
        },
      });
    });

    // 対象ユーザーにアクセスキー作成通知を発行
    await NotificationService.securityNotify(targetUserId, {
      title: "New access key created",
      titleJa: "新しいアクセスキーが作成されました",
      message: `An access key "${name}" has been created for your account.`,
      messageJa: `アカウントにアクセスキー「${name}」が作成されました。`,
    }).catch((err) => {
      console.error("[AccessKey] Failed to create notification:", err);
    });

    return NextResponse.json({ accessKey });
  } catch (error) {
    console.error("Error creating Access key:", error);
    return NextResponse.json(
      { error: "Failed to create Access key" },
      { status: 500 },
    );
  }
}

// Update Access key (activate/deactivate)
export async function PATCH(request: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const accessKey = await prisma.accessKey.update({
      where: { id },
      data: { isActive },
      include: {
        targetUser: {
          select: { id: true },
        },
      },
    });

    // 対象ユーザーにアクセスキー状態変更通知を発行
    if (accessKey.targetUser) {
      await NotificationService.securityNotify(accessKey.targetUser.id, {
        title: isActive ? "Access key activated" : "Access key deactivated",
        titleJa: isActive
          ? "アクセスキーが有効になりました"
          : "アクセスキーが無効になりました",
        message: `Your access key "${accessKey.name}" has been ${isActive ? "activated" : "deactivated"}.`,
        messageJa: `アクセスキー「${accessKey.name}」が${isActive ? "有効" : "無効"}になりました。`,
      }).catch((err) => {
        console.error("[AccessKey] Failed to create notification:", err);
      });
    }

    return NextResponse.json({ accessKey });
  } catch (error) {
    console.error("Error updating Access key:", error);
    return NextResponse.json(
      { error: "Failed to update Access key" },
      { status: 500 },
    );
  }
}

// Delete Access key
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing Access key ID" },
        { status: 400 },
      );
    }

    // 削除前にアクセスキー情報を取得
    const accessKey = await prisma.accessKey.findUnique({
      where: { id },
      include: {
        targetUser: {
          select: { id: true },
        },
      },
    });

    await prisma.accessKey.delete({
      where: { id },
    });

    // 対象ユーザーにアクセスキー削除通知を発行
    if (accessKey?.targetUser) {
      await NotificationService.securityNotify(accessKey.targetUser.id, {
        title: "Access key deleted",
        titleJa: "アクセスキーが削除されました",
        message: `Your access key "${accessKey.name}" has been deleted.`,
        messageJa: `アクセスキー「${accessKey.name}」が削除されました。`,
      }).catch((err) => {
        console.error("[AccessKey] Failed to create notification:", err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Access key:", error);
    return NextResponse.json(
      { error: "Failed to delete Access key" },
      { status: 500 },
    );
  }
}
