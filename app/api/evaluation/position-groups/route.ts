import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/evaluation/position-groups
 * 役職グループ一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      );
    }

    const groups = await prisma.positionGroup.findMany({
      where: { periodId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching position groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch position groups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evaluation/position-groups
 * 役職グループの作成・更新
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, periodId, id, name, nameEn, displayOrder, positionCodes, groups } = body;

    // 一括更新（順序変更時）
    if (action === "reorder") {
      if (!periodId || !groups || !Array.isArray(groups)) {
        return NextResponse.json(
          { error: "periodId and groups array are required" },
          { status: 400 }
        );
      }

      // トランザクションで一括更新
      await prisma.$transaction(
        groups.map((g: { id: string; displayOrder: number }) =>
          prisma.positionGroup.update({
            where: { id: g.id },
            data: { displayOrder: g.displayOrder },
          })
        )
      );

      return NextResponse.json({ success: true });
    }

    // 全グループの保存（順序変更時、新規グループも含む）
    if (action === "save-all") {
      if (!periodId || !groups || !Array.isArray(groups)) {
        return NextResponse.json(
          { error: "periodId and groups array are required" },
          { status: 400 }
        );
      }

      // 既存のグループを取得
      const existingGroups = await prisma.positionGroup.findMany({
        where: { periodId },
      });
      const existingIds = new Set(existingGroups.map((g) => g.id));

      // トランザクションで処理
      await prisma.$transaction(async (tx) => {
        for (const g of groups as Array<{
          id: string | null;
          name: string;
          positionCodes: string[];
          displayOrder: number;
        }>) {
          if (g.id && existingIds.has(g.id)) {
            // 既存グループを更新
            await tx.positionGroup.update({
              where: { id: g.id },
              data: {
                displayOrder: g.displayOrder,
                name: g.name,
                positionCodes: g.positionCodes,
              },
            });
          } else {
            // 新規グループを作成
            await tx.positionGroup.create({
              data: {
                periodId,
                name: g.name,
                positionCodes: g.positionCodes,
                displayOrder: g.displayOrder,
              },
            });
          }
        }
      });

      return NextResponse.json({ success: true });
    }

    // グループの初期化（検出時に自動作成）
    if (action === "initialize") {
      if (!periodId || !groups || !Array.isArray(groups)) {
        return NextResponse.json(
          { error: "periodId and groups array are required" },
          { status: 400 }
        );
      }

      // 既存のグループを削除
      await prisma.positionGroup.deleteMany({
        where: { periodId },
      });

      // 新しいグループを作成
      await prisma.positionGroup.createMany({
        data: groups.map((g: { name: string; positionCodes: string[] }, index: number) => ({
          periodId,
          name: g.name,
          displayOrder: index,
          positionCodes: g.positionCodes,
        })),
      });

      return NextResponse.json({ success: true });
    }

    // 役職の結合（複数の役職を1つのグループに）
    if (action === "merge") {
      console.log("[merge] Received positionCodes:", positionCodes);
      console.log("[merge] Received name:", name);

      if (!periodId || !positionCodes || !Array.isArray(positionCodes) || positionCodes.length < 2) {
        return NextResponse.json(
          { error: "periodId and at least 2 positionCodes are required" },
          { status: 400 }
        );
      }

      // 結合対象の既存グループを取得
      const existingGroups = await prisma.positionGroup.findMany({
        where: { periodId },
        orderBy: { displayOrder: "asc" },
      });

      if (existingGroups.length === 0) {
        // グループがまだない場合は、新しい結合グループを作成
        await prisma.positionGroup.create({
          data: {
            periodId,
            name: name || "結合グループ",
            displayOrder: 0,
            positionCodes: positionCodes,
          },
        });
        return NextResponse.json({ success: true });
      }

      // 結合対象の役職コードを持つグループを特定
      const targetGroupIds: string[] = [];
      const allCodes: string[] = [...positionCodes]; // 選択された役職コードを最初に追加

      for (const group of existingGroups) {
        const codes = group.positionCodes as string[];
        const hasTargetCode = codes.some((c) => positionCodes.includes(c));
        if (hasTargetCode) {
          targetGroupIds.push(group.id);
          allCodes.push(...codes);
        }
      }

      // 重複を除去
      const mergedCodes = [...new Set(allCodes)];
      console.log("[merge] targetGroupIds:", targetGroupIds);
      console.log("[merge] mergedCodes:", mergedCodes);

      // 最初のグループを更新、残りを削除
      if (targetGroupIds.length > 0) {
        // 最初のグループを更新
        await prisma.positionGroup.update({
          where: { id: targetGroupIds[0] },
          data: {
            name: name || `結合グループ`,
            positionCodes: mergedCodes,
          },
        });

        // 残りのグループを削除
        if (targetGroupIds.length > 1) {
          await prisma.positionGroup.deleteMany({
            where: { id: { in: targetGroupIds.slice(1) } },
          });
        }
      } else {
        // 対象グループがない場合は新規作成
        const maxOrder = Math.max(...existingGroups.map((g) => g.displayOrder), -1);
        await prisma.positionGroup.create({
          data: {
            periodId,
            name: name || "結合グループ",
            displayOrder: maxOrder + 1,
            positionCodes: positionCodes,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    // 役職の分離（グループから役職を取り出す）
    if (action === "split") {
      if (!id || !positionCodes || !Array.isArray(positionCodes)) {
        return NextResponse.json(
          { error: "id and positionCodes are required" },
          { status: 400 }
        );
      }

      const group = await prisma.positionGroup.findUnique({
        where: { id },
      });

      if (!group) {
        return NextResponse.json(
          { error: "Group not found" },
          { status: 404 }
        );
      }

      const currentCodes = group.positionCodes as string[];
      const remainingCodes = currentCodes.filter((c) => !positionCodes.includes(c));

      // 最大のdisplayOrderを取得
      const maxOrder = await prisma.positionGroup.aggregate({
        where: { periodId: group.periodId },
        _max: { displayOrder: true },
      });

      const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

      // 元のグループを更新
      if (remainingCodes.length > 0) {
        await prisma.positionGroup.update({
          where: { id },
          data: { positionCodes: remainingCodes },
        });
      } else {
        // 全て分離された場合は元のグループを削除
        await prisma.positionGroup.delete({
          where: { id },
        });
      }

      // 分離した役職ごとに新しいグループを作成
      await prisma.positionGroup.createMany({
        data: positionCodes.map((code: string, index: number) => ({
          periodId: group.periodId,
          name: code,
          displayOrder: nextOrder + index,
          positionCodes: [code],
        })),
      });

      return NextResponse.json({ success: true });
    }

    // 単一グループの作成・更新
    if (id) {
      // 更新
      const updated = await prisma.positionGroup.update({
        where: { id },
        data: {
          name,
          nameEn,
          displayOrder,
          positionCodes,
        },
      });
      return NextResponse.json(updated);
    } else {
      // 作成
      if (!periodId || !name || !positionCodes) {
        return NextResponse.json(
          { error: "periodId, name, and positionCodes are required" },
          { status: 400 }
        );
      }

      // 最大のdisplayOrderを取得
      const maxOrder = await prisma.positionGroup.aggregate({
        where: { periodId },
        _max: { displayOrder: true },
      });

      const created = await prisma.positionGroup.create({
        data: {
          periodId,
          name,
          nameEn,
          displayOrder: displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
          positionCodes,
        },
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Error updating position group:", error);
    return NextResponse.json(
      { error: "Failed to update position group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/evaluation/position-groups
 * 役職グループを削除
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.positionGroup.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error("Error deleting position group:", error);
    return NextResponse.json(
      { error: "Failed to delete position group" },
      { status: 500 }
    );
  }
}
