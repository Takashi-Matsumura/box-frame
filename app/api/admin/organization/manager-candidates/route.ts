import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";

/**
 * GET /api/admin/organization/manager-candidates
 *
 * 責任者候補の社員をリストアップ
 *
 * ロジック:
 * - 本部の責任者: 役員 + その本部の本部長/事業部長
 * - 部・課の責任者: その本部に所属する役職持ち（一般ではない）社員
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // department, section, course
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID are required" },
        { status: 400 }
      );
    }

    // 本部長クラスを示す役職キーワード
    const departmentHeadPositions = [
      "本部長",
      "事業部長",
      "副本部長",
      "統括部長",
    ];

    // エキスパートの役職コード（これ未満の役職コードを持つ社員のみ候補とする）
    const EXPERT_POSITION_CODE = "302";

    // 役職コードがエキスパート未満かチェック（責任者候補として適格か）
    const isEligibleForManager = (positionCode: string | null): boolean => {
      if (!positionCode) return false;
      // 一般社員（000）は除外
      if (positionCode === "000") return false;
      // 特殊コード（名誉会長900、監査役903など）は除外
      if (positionCode >= "900") return false;
      // エキスパート以上の役職のみ（役職コードが小さい＝役職が高い）
      return positionCode < EXPERT_POSITION_CODE;
    };

    // 役職コード順（昇順）、同じ役職コードは氏名順でソート
    const sortByPositionCode = (
      a: { positionCode: string | null; name: string },
      b: { positionCode: string | null; name: string }
    ) => {
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";

      if (codeA !== codeB) {
        return codeA.localeCompare(codeB);
      }

      // 同じ役職コードの場合は氏名でソート
      return a.name.localeCompare(b.name, "ja");
    };

    let candidates: { id: string; employeeId: string; name: string; position: string | null; positionCode: string | null }[] = [];

    if (type === "department") {
      // 本部の責任者候補: 役員 + その本部の本部長/事業部長

      const department = await prisma.department.findUnique({
        where: { id },
        select: { organizationId: true, name: true },
      });

      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        );
      }

      // 1. 役員・顧問本部から役員を取得
      const executivesDepartment = await prisma.department.findFirst({
        where: {
          organizationId: department.organizationId,
          name: EXECUTIVES_DEPARTMENT_NAME,
        },
      });

      let executives: { id: string; employeeId: string; name: string; position: string | null; positionCode: string | null }[] = [];
      if (executivesDepartment) {
        executives = await prisma.employee.findMany({
          where: {
            departmentId: executivesDepartment.id,
            isActive: true,
          },
          select: {
            id: true,
            employeeId: true,
            name: true,
            position: true,
            positionCode: true,
          },
        });
      }

      // 2. その本部の本部長/事業部長を取得
      const departmentHeads = await prisma.employee.findMany({
        where: {
          departmentId: id,
          isActive: true,
          OR: departmentHeadPositions.map((pos) => ({
            position: { contains: pos },
          })),
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          position: true,
          positionCode: true,
        },
      });

      // 重複を除去してマージ
      const candidateMap = new Map();
      for (const emp of executives) {
        if (isEligibleForManager(emp.positionCode)) {
          candidateMap.set(emp.id, emp);
        }
      }
      for (const emp of departmentHeads) {
        if (isEligibleForManager(emp.positionCode)) {
          candidateMap.set(emp.id, emp);
        }
      }
      candidates = Array.from(candidateMap.values()).sort(sortByPositionCode);
    } else if (type === "section") {
      // 部の責任者候補: その本部に所属する役職持ち（一般ではない）社員

      const section = await prisma.section.findUnique({
        where: { id },
        select: { departmentId: true },
      });

      if (!section) {
        return NextResponse.json(
          { error: "Section not found" },
          { status: 404 }
        );
      }

      const sectionCandidates = await prisma.employee.findMany({
        where: {
          departmentId: section.departmentId,
          isActive: true,
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          position: true,
          positionCode: true,
        },
      });
      // 役職コードでフィルター（エキスパート未満のみ）してソート
      candidates = sectionCandidates
        .filter((emp) => isEligibleForManager(emp.positionCode))
        .sort(sortByPositionCode);
    } else if (type === "course") {
      // 課の責任者候補: その本部に所属する役職持ち（一般ではない）社員

      const course = await prisma.course.findUnique({
        where: { id },
        select: {
          section: {
            select: { departmentId: true },
          },
        },
      });

      if (!course) {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 }
        );
      }

      const courseCandidates = await prisma.employee.findMany({
        where: {
          departmentId: course.section.departmentId,
          isActive: true,
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          position: true,
          positionCode: true,
        },
      });
      // 役職コードでフィルター（エキスパート未満のみ）してソート
      candidates = courseCandidates
        .filter((emp) => isEligibleForManager(emp.positionCode))
        .sort(sortByPositionCode);
    }

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Error fetching manager candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch manager candidates" },
      { status: 500 }
    );
  }
}
