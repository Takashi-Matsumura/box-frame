import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ExclusionReason } from "@prisma/client";

/**
 * GET /api/evaluation/exclusions
 * 評価対象外設定一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manager以上のロールが必要
    const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
    if (!allowedRoles.includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    const where: Record<string, unknown> = {};
    if (periodId) {
      where.OR = [{ periodId }, { periodId: null }];
    }

    const exclusions = await prisma.evaluationExclusion.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            position: true,
            department: { select: { name: true } },
            section: { select: { name: true } },
            course: { select: { name: true } },
          },
        },
        period: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(exclusions);
  } catch (error) {
    console.error("Error fetching exclusions:", error);
    return NextResponse.json(
      { error: "Failed to fetch exclusions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evaluation/exclusions
 * 評価対象外を設定
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manager以上のロールが必要
    const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
    if (!allowedRoles.includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId, periodId, reason, note } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    // 有効な理由かチェック
    const validReasons: ExclusionReason[] = [
      "MATERNITY_LEAVE",
      "SICK_LEAVE",
      "RESIGNATION",
      "SECONDMENT",
      "PROBATION",
      "OTHER",
    ];
    if (reason && !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid exclusion reason" },
        { status: 400 }
      );
    }

    // 既存の設定をチェック
    const existing = await prisma.evaluationExclusion.findFirst({
      where: {
        employeeId,
        periodId: periodId || null,
      },
    });

    if (existing) {
      // 更新
      const updated = await prisma.evaluationExclusion.update({
        where: { id: existing.id },
        data: {
          reason: reason || "OTHER",
          note: note || null,
        },
        include: {
          employee: { select: { name: true } },
          period: { select: { name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // 新規作成
    const created = await prisma.evaluationExclusion.create({
      data: {
        employeeId,
        periodId: periodId || null,
        reason: reason || "OTHER",
        note: note || null,
      },
      include: {
        employee: { select: { name: true } },
        period: { select: { name: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating exclusion:", error);
    return NextResponse.json(
      { error: "Failed to create exclusion" },
      { status: 500 }
    );
  }
}
