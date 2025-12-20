import type { Role } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users
 *
 * ユーザ一覧を取得（ページネーション、検索、フィルター、ソート対応）
 *
 * Query Parameters:
 * - page: ページ番号（デフォルト: 1）
 * - pageSize: 1ページあたりの件数（デフォルト: 20）
 * - search: 検索クエリ（名前またはメール）
 * - role: ロールフィルター（ADMIN, MANAGER, USER, GUEST）
 * - sortBy: ソート対象カラム（name, email, role, createdAt）（デフォルト: createdAt）
 * - sortOrder: ソート順序（asc, desc）（デフォルト: desc）
 *
 * Response:
 * {
 *   users: Array<User>;
 *   total: number;
 *   page: number;
 *   totalPages: number;
 *   pageSize: number;
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") as Role | null;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // バリデーション
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }

    // ソートパラメータのバリデーション
    const validSortFields = ["name", "email", "role", "createdAt"];
    const validSortOrders = ["asc", "desc"];
    if (
      !validSortFields.includes(sortBy) ||
      !validSortOrders.includes(sortOrder)
    ) {
      return NextResponse.json(
        { error: "Invalid sort parameters" },
        { status: 400 },
      );
    }

    // フィルター条件を構築
    const where: {
      AND?: Array<{
        OR?: Array<{
          name?: { contains: string };
          email?: { contains: string };
        }>;
        role?: Role;
      }>;
    } = {};

    const conditions: Array<{
      OR?: Array<{ name?: { contains: string }; email?: { contains: string } }>;
      role?: Role;
    }> = [];

    // 検索条件
    if (search) {
      conditions.push({
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      });
    }

    // ロールフィルター
    if (role && ["ADMIN", "MANAGER", "USER", "GUEST"].includes(role)) {
      conditions.push({ role });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // 総件数を取得
    const total = await prisma.user.count({ where });

    // ページネーション付きでユーザを取得（組織データも含める）
    const users = await prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        lastSignInAt: true,
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
