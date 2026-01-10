import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees
 *
 * 社員一覧を取得（フィルター・ページネーション対応）
 *
 * クエリパラメータ:
 * - departmentId: 本部ID
 * - sectionId: 部ID
 * - courseId: 課ID
 * - search: 名前・社員番号検索
 * - position: 役職フィルター
 * - isActive: 在籍ステータス（true/false）
 * - exclusiveMode: 重複しない表示モード（true: 各階層に直接所属する社員のみ表示）
 * - page: ページ番号（デフォルト: 1）
 * - limit: 1ページあたりの件数（デフォルト: 50）
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const sectionId = searchParams.get("sectionId");
    const courseId = searchParams.get("courseId");
    const search = searchParams.get("search");
    const position = searchParams.get("position");
    const isActiveParam = searchParams.get("isActive");
    const exclusiveMode = searchParams.get("exclusiveMode") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // 組織を取得（最初の組織を使用）
    const organization = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!organization) {
      return NextResponse.json({
        employees: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
    }

    // フィルター条件を構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      organizationId: organization.id,
    };

    // 在籍ステータスフィルター（デフォルトは在籍中のみ）
    if (isActiveParam === "false") {
      where.isActive = false;
    } else if (isActiveParam === "all") {
      // 全て表示（条件なし）
    } else {
      where.isActive = true;
    }

    // 組織階層フィルター
    // exclusiveMode: 重複しない表示（各階層に直接所属する社員のみ）
    // - 課を選択: その課に所属する社員のみ
    // - 部を選択: その部に所属し、課には所属しない社員のみ
    // - 本部を選択: その本部に所属し、部には所属しない社員のみ
    if (courseId) {
      where.courseId = courseId;
    } else if (sectionId) {
      where.sectionId = sectionId;
      if (exclusiveMode) {
        where.courseId = null; // 課に所属していない社員のみ
      }
    } else if (departmentId) {
      where.departmentId = departmentId;
      if (exclusiveMode) {
        where.sectionId = null; // 部に所属していない社員のみ
      }
    }

    // 検索フィルター（名前・社員番号・メール）
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameKana: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // 役職フィルター
    if (position) {
      where.position = position;
    }

    // 総件数を取得
    const total = await prisma.employee.count({ where });

    // 社員一覧を取得（ソートはJavaScriptで行う）
    const allEmployees = await prisma.employee.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        section: {
          select: { id: true, name: true, code: true },
        },
        course: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // カスタムソート: 役職コード順（「000」は最後）、同じ役職コードは名前の五十音順
    const sortedEmployees = allEmployees.sort((a, b) => {
      const codeA = a.positionCode || "999"; // null/undefinedは最後の方
      const codeB = b.positionCode || "999";

      // 「000」（一般社員）は最後に
      const isGeneralA = codeA === "000";
      const isGeneralB = codeB === "000";

      if (isGeneralA && !isGeneralB) return 1;
      if (!isGeneralA && isGeneralB) return -1;

      // 役職コードで昇順ソート
      if (codeA !== codeB) {
        return codeA.localeCompare(codeB);
      }

      // 同じ役職コードの場合は名前カナ（五十音順）でソート
      const nameA = a.nameKana || a.name || "";
      const nameB = b.nameKana || b.name || "";
      return nameA.localeCompare(nameB, "ja");
    });

    // ページネーション適用
    const employees = sortedEmployees.slice((page - 1) * limit, page * limit);

    // 役職リストを取得（フィルター用）
    const positionsData = await prisma.employee.findMany({
      where: {
        organizationId: organization.id,
        isActive: true,
      },
      select: { position: true, positionCode: true },
      distinct: ["position"],
    });

    // 役職リストをソート（役職コード順、「000」は最後）
    const sortedPositions = positionsData.sort((a, b) => {
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";

      if (codeA === "000" && codeB !== "000") return 1;
      if (codeA !== "000" && codeB === "000") return -1;

      return codeA.localeCompare(codeB);
    });

    return NextResponse.json({
      employees: employees.map((emp) => ({
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        nameKana: emp.nameKana,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        positionCode: emp.positionCode,
        department: emp.department,
        section: emp.section,
        course: emp.course,
        isActive: emp.isActive,
        joinDate: emp.joinDate,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      positions: sortedPositions.map((p) => p.position),
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 },
    );
  }
}
