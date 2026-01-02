import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/organization/employees
 *
 * 社員一覧を取得（ページネーション、検索、フィルター対応）
 *
 * Query Parameters:
 * - organizationId: 組織ID（必須）
 * - page: ページ番号（デフォルト: 1）
 * - pageSize: 1ページあたりの件数（デフォルト: 50）
 * - search: 検索クエリ（名前、社員番号、メール）
 * - departmentId: 本部フィルター
 * - sectionId: 部フィルター
 * - courseId: 課フィルター
 * - isActive: 在籍状況フィルター
 * - sortBy: ソート対象カラム
 * - sortOrder: ソート順序（asc, desc）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId");
    const sectionId = searchParams.get("sectionId");
    const courseId = searchParams.get("courseId");
    const isActive = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") || "employeeId";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // バリデーション
    if (page < 1 || pageSize < 1 || pageSize > 200) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    // ソートパラメータのバリデーション
    const validSortFields = [
      "employeeId",
      "name",
      "nameKana",
      "email",
      "position",
      "createdAt",
    ];
    const validSortOrders = ["asc", "desc"];
    if (
      !validSortFields.includes(sortBy) ||
      !validSortOrders.includes(sortOrder)
    ) {
      return NextResponse.json(
        { error: "Invalid sort parameters" },
        { status: 400 }
      );
    }

    // フィルター条件を構築
    const where: {
      organizationId: string;
      AND?: Array<{
        OR?: Array<{
          name?: { contains: string };
          employeeId?: { contains: string };
          email?: { contains: string };
        }>;
        departmentId?: string;
        sectionId?: string;
        courseId?: string;
        isActive?: boolean;
      }>;
    } = { organizationId };

    const conditions: Array<{
      OR?: Array<{
        name?: { contains: string };
        employeeId?: { contains: string };
        email?: { contains: string };
      }>;
      departmentId?: string;
      sectionId?: string;
      courseId?: string;
      isActive?: boolean;
    }> = [];

    // 検索条件
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search } },
          { employeeId: { contains: search } },
          { email: { contains: search } },
        ],
      });
    }

    // 本部フィルター
    if (departmentId) {
      conditions.push({ departmentId });
    }

    // 部フィルター
    if (sectionId) {
      conditions.push({ sectionId });
    }

    // 課フィルター
    if (courseId) {
      conditions.push({ courseId });
    }

    // 在籍状況フィルター
    if (isActive !== null && isActive !== "") {
      conditions.push({ isActive: isActive === "true" });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // 総件数を取得
    const total = await prisma.employee.count({ where });

    // ページネーション付きで社員を取得
    const employees = await prisma.employee.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        department: true,
        section: true,
        course: true,
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      employees,
      total,
      page,
      totalPages,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
