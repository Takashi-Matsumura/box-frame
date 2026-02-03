import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/calendar/team-schedule
 *
 * マネージャーが管理する部署のメンバーのスケジュールを取得します。
 *
 * クエリパラメータ:
 * - startDate: 開始日（YYYY-MM-DD）
 * - endDate: 終了日（YYYY-MM-DD）
 *
 * @example レスポンス
 * ```json
 * {
 *   "teamMembers": [
 *     { "id": "emp1", "name": "田中太郎", "departmentName": "営業部" }
 *   ],
 *   "events": [
 *     { "id": "ev1", "userId": "user1", "employeeName": "田中太郎", "title": "会議", ... }
 *   ],
 *   "managedUnits": {
 *     "departments": [...],
 *     "sections": [...],
 *     "courses": [...]
 *   }
 * }
 * ```
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // マネージャー以上のロールが必要
    const allowedRoles = ["MANAGER", "EXECUTIVE", "ADMIN"];
    if (!allowedRoles.includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 公開中の組織を取得
    const organization = await prisma.organization.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });

    if (!organization) {
      return NextResponse.json({
        teamMembers: [],
        events: [],
        managedUnits: { departments: [], sections: [], courses: [] },
      });
    }

    // 現在のユーザーのメールアドレスから社員レコードを取得
    const currentEmployee = await prisma.employee.findFirst({
      where: {
        email: session.user.email,
        organizationId: organization.id,
        isActive: true,
      },
      include: {
        managedDepartments: {
          select: { id: true, name: true },
        },
        managedSections: {
          select: { id: true, name: true, departmentId: true },
        },
        managedCourses: {
          select: { id: true, name: true, sectionId: true },
        },
        department: {
          select: { id: true, name: true },
        },
        section: {
          select: { id: true, name: true },
        },
        course: {
          select: { id: true, name: true },
        },
      },
    });

    // 管理している部署が見つからない場合は、所属部署のメンバーを表示
    // （ADMINの場合や、社員レコードがない場合は全員を対象とするオプションもあり）
    let teamMemberIds: string[] = [];

    if (currentEmployee) {
      // 管理している本部の全社員
      if (currentEmployee.managedDepartments.length > 0) {
        const deptIds = currentEmployee.managedDepartments.map((d) => d.id);
        const deptMembers = await prisma.employee.findMany({
          where: {
            departmentId: { in: deptIds },
            isActive: true,
          },
          select: { id: true },
        });
        teamMemberIds.push(...deptMembers.map((e) => e.id));
      }

      // 管理している部の全社員
      if (currentEmployee.managedSections.length > 0) {
        const secIds = currentEmployee.managedSections.map((s) => s.id);
        const secMembers = await prisma.employee.findMany({
          where: {
            sectionId: { in: secIds },
            isActive: true,
          },
          select: { id: true },
        });
        teamMemberIds.push(...secMembers.map((e) => e.id));
      }

      // 管理している課の全社員
      if (currentEmployee.managedCourses.length > 0) {
        const courseIds = currentEmployee.managedCourses.map((c) => c.id);
        const courseMembers = await prisma.employee.findMany({
          where: {
            courseId: { in: courseIds },
            isActive: true,
          },
          select: { id: true },
        });
        teamMemberIds.push(...courseMembers.map((e) => e.id));
      }

      // 管理部署がない場合は、自分と同じ所属の社員を取得
      if (teamMemberIds.length === 0) {
        const whereCondition: {
          isActive: boolean;
          departmentId?: string;
          sectionId?: string | null;
          courseId?: string | null;
        } = {
          isActive: true,
        };

        if (currentEmployee.courseId) {
          whereCondition.courseId = currentEmployee.courseId;
        } else if (currentEmployee.sectionId) {
          whereCondition.sectionId = currentEmployee.sectionId;
        } else {
          whereCondition.departmentId = currentEmployee.departmentId;
        }

        const sameUnitMembers = await prisma.employee.findMany({
          where: whereCondition,
          select: { id: true },
        });
        teamMemberIds.push(...sameUnitMembers.map((e) => e.id));
      }
    }

    // ADMINの場合、社員レコードがなくても全社員を対象にできるオプション
    if (session.user.role === "ADMIN" && teamMemberIds.length === 0) {
      const allEmployees = await prisma.employee.findMany({
        where: {
          organizationId: organization.id,
          isActive: true,
        },
        select: { id: true },
        take: 100, // 最大100名
      });
      teamMemberIds = allEmployees.map((e) => e.id);
    }

    // 重複を除去
    teamMemberIds = [...new Set(teamMemberIds)];

    // チームメンバーの詳細情報を取得
    const teamMembers = await prisma.employee.findMany({
      where: {
        id: { in: teamMemberIds },
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: { select: { name: true } },
        section: { select: { name: true } },
        course: { select: { name: true } },
      },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    });

    // チームメンバーのメールアドレスからユーザーIDを取得
    const memberEmails = teamMembers
      .filter((m) => m.email)
      .map((m) => m.email as string);

    const users = await prisma.user.findMany({
      where: {
        email: { in: memberEmails },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const emailToUserId = new Map(users.map((u) => [u.email, u.id]));

    // メンバーにuserIdを追加
    const teamMembersWithUserId = teamMembers.map((m) => ({
      id: m.id,
      employeeId: m.employeeId,
      name: m.name,
      email: m.email,
      userId: m.email ? emailToUserId.get(m.email) || null : null,
      departmentName: m.department?.name || null,
      sectionName: m.section?.name || null,
      courseName: m.course?.name || null,
    }));

    // ユーザーIDがあるメンバーのイベントを取得
    const userIds = teamMembersWithUserId
      .filter((m) => m.userId)
      .map((m) => m.userId as string);

    let events: {
      id: string;
      userId: string;
      title: string;
      description: string | null;
      location: string | null;
      startTime: Date;
      endTime: Date;
      allDay: boolean;
      category: string;
      color: string | null;
    }[] = [];

    if (userIds.length > 0) {
      const whereClause: {
        userId: { in: string[] };
        startTime?: { lte: Date };
        endTime?: { gte: Date };
      } = {
        userId: { in: userIds },
      };

      if (startDate) {
        whereClause.endTime = { gte: new Date(startDate) };
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        whereClause.startTime = { lte: end };
      }

      events = await prisma.calendarEvent.findMany({
        where: whereClause,
        orderBy: { startTime: "asc" },
      });
    }

    // イベントに社員名を追加
    const userIdToEmployee = new Map(
      teamMembersWithUserId
        .filter((m) => m.userId)
        .map((m) => [m.userId, m]),
    );

    const eventsWithEmployeeInfo = events.map((event) => {
      const employee = userIdToEmployee.get(event.userId);
      return {
        id: event.id,
        userId: event.userId,
        employeeId: employee?.employeeId || null,
        employeeName: employee?.name || null,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        allDay: event.allDay,
        category: event.category,
        color: event.color,
      };
    });

    return NextResponse.json({
      teamMembers: teamMembersWithUserId,
      events: eventsWithEmployeeInfo,
      managedUnits: {
        departments: currentEmployee?.managedDepartments || [],
        sections: currentEmployee?.managedSections || [],
        courses: currentEmployee?.managedCourses || [],
      },
      currentEmployee: currentEmployee
        ? {
            id: currentEmployee.id,
            name: currentEmployee.name,
            departmentName: currentEmployee.department?.name,
            sectionName: currentEmployee.section?.name,
            courseName: currentEmployee.course?.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching team schedule:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch team schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
