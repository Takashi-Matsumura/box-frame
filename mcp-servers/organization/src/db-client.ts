import { PrismaClient } from "@prisma/client";

// --- 結果型定義 ---

export interface EmployeeInfo {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  positionCode: string | null;
  qualificationGrade: string | null;
  qualificationGradeCode: string | null;
  employmentType: string | null;
  employmentTypeCode: string | null;
  joinDate: string | null;
  birthDate: string | null;
  isActive: boolean;
  department: string | null;
  section: string | null;
  course: string | null;
}

export interface ManagerInfo {
  id: string;
  employeeId: string;
  name: string;
  position: string;
}

export interface CourseNode {
  id: string;
  name: string;
  code: string | null;
  manager: ManagerInfo | null;
  employeeCount: number;
}

export interface SectionNode {
  id: string;
  name: string;
  code: string | null;
  manager: ManagerInfo | null;
  employeeCount: number;
  courses: CourseNode[];
}

export interface DepartmentNode {
  id: string;
  name: string;
  code: string | null;
  manager: ManagerInfo | null;
  employeeCount: number;
  sectionCount: number;
  sections: SectionNode[];
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string | null;
  manager: ManagerInfo | null;
  employeeCount: number;
  sectionCount: number;
}

export interface ListEmployeesResult {
  success: boolean;
  employees?: EmployeeInfo[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
}

export interface GetEmployeeResult {
  success: boolean;
  employee?: EmployeeInfo;
  error?: string;
}

export interface SearchEmployeesResult {
  success: boolean;
  employees?: EmployeeInfo[];
  error?: string;
}

/**
 * 組織データベースクライアント（読み取り専用）
 * MCPサーバ用にPrisma経由でDBアクセス
 */
export class DbClient {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 環境変数からPrismaClientを初期化してインスタンスを作成
   */
  static createFromEnv(): DbClient {
    const prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
    return new DbClient(prisma);
  }

  /**
   * DB接続が利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * PUBLISHED状態の組織を取得（内部ヘルパー）
   */
  private async getPublishedOrganization() {
    return this.prisma.organization.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });
  }

  /**
   * マネージャー情報をフォーマット
   */
  private formatManager(
    manager: { id: string; employeeId: string; name: string; position: string } | null,
  ): ManagerInfo | null {
    if (!manager) return null;
    return {
      id: manager.id,
      employeeId: manager.employeeId,
      name: manager.name,
      position: manager.position,
    };
  }

  /**
   * 社員情報をフォーマット
   */
  private formatEmployee(emp: {
    id: string;
    employeeId: string;
    name: string;
    nameKana: string | null;
    email: string | null;
    phone: string | null;
    position: string;
    positionCode: string | null;
    qualificationGrade: string | null;
    qualificationGradeCode: string | null;
    employmentType: string | null;
    employmentTypeCode: string | null;
    joinDate: Date | null;
    birthDate: Date | null;
    isActive: boolean;
    department: { name: string } | null;
    section: { name: string } | null;
    course: { name: string } | null;
  }): EmployeeInfo {
    return {
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      nameKana: emp.nameKana,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      positionCode: emp.positionCode,
      qualificationGrade: emp.qualificationGrade,
      qualificationGradeCode: emp.qualificationGradeCode,
      employmentType: emp.employmentType,
      employmentTypeCode: emp.employmentTypeCode,
      joinDate: emp.joinDate?.toISOString().split("T")[0] ?? null,
      birthDate: emp.birthDate?.toISOString().split("T")[0] ?? null,
      isActive: emp.isActive,
      department: emp.department?.name ?? null,
      section: emp.section?.name ?? null,
      course: emp.course?.name ?? null,
    };
  }

  /**
   * 組織階層ツリーを取得
   */
  async getStructure(): Promise<{
    success: boolean;
    organization?: { id: string; name: string; status: string };
    departments?: DepartmentNode[];
    totalEmployees?: number;
    error?: string;
  }> {
    const org = await this.getPublishedOrganization();
    if (!org) {
      return { success: false, error: "No published organization found" };
    }

    const departments = await this.prisma.department.findMany({
      where: { organizationId: org.id },
      include: {
        manager: { select: { id: true, employeeId: true, name: true, position: true } },
        sections: {
          include: {
            manager: { select: { id: true, employeeId: true, name: true, position: true } },
            courses: {
              include: {
                manager: { select: { id: true, employeeId: true, name: true, position: true } },
                _count: { select: { employees: true } },
              },
            },
            _count: { select: { employees: true } },
          },
        },
        _count: { select: { employees: true } },
      },
      orderBy: { name: "asc" },
    });

    const totalEmployees = await this.prisma.employee.count({
      where: { organizationId: org.id, isActive: true },
    });

    const deptNodes: DepartmentNode[] = departments.map(
      (dept: (typeof departments)[number]) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        manager: this.formatManager(dept.manager),
        employeeCount: dept._count.employees,
        sectionCount: dept.sections.length,
        sections: dept.sections.map(
          (sec: (typeof dept.sections)[number]) => ({
            id: sec.id,
            name: sec.name,
            code: sec.code,
            manager: this.formatManager(sec.manager),
            employeeCount: sec._count.employees,
            courses: sec.courses.map(
              (crs: (typeof sec.courses)[number]) => ({
                id: crs.id,
                name: crs.name,
                code: crs.code,
                manager: this.formatManager(crs.manager),
                employeeCount: crs._count.employees,
              }),
            ),
          }),
        ),
      }),
    );

    return {
      success: true,
      organization: { id: org.id, name: org.name, status: org.status },
      departments: deptNodes,
      totalEmployees,
    };
  }

  /**
   * 本部一覧を取得
   */
  async listDepartments(): Promise<{
    success: boolean;
    departments?: DepartmentSummary[];
    error?: string;
  }> {
    const org = await this.getPublishedOrganization();
    if (!org) {
      return { success: false, error: "No published organization found" };
    }

    const departments = await this.prisma.department.findMany({
      where: { organizationId: org.id },
      include: {
        manager: { select: { id: true, employeeId: true, name: true, position: true } },
        _count: { select: { employees: true, sections: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      departments: departments.map(
        (dept: (typeof departments)[number]) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          manager: this.formatManager(dept.manager),
          employeeCount: dept._count.employees,
          sectionCount: dept._count.sections,
        }),
      ),
    };
  }

  /**
   * 社員一覧を取得
   */
  async listEmployees(options?: {
    departmentId?: string;
    sectionId?: string;
    courseId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListEmployeesResult> {
    const org = await this.getPublishedOrganization();
    if (!org) {
      return { success: false, error: "No published organization found" };
    }

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const where: {
      organizationId: string;
      isActive: boolean;
      departmentId?: string;
      sectionId?: string;
      courseId?: string;
    } = {
      organizationId: org.id,
      isActive: true,
    };

    if (options?.departmentId) where.departmentId = options.departmentId;
    if (options?.sectionId) where.sectionId = options.sectionId;
    if (options?.courseId) where.courseId = options.courseId;

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: {
          department: { select: { name: true } },
          section: { select: { name: true } },
          course: { select: { name: true } },
        },
        orderBy: { employeeId: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      success: true,
      employees: employees.map(
        (emp: (typeof employees)[number]) => this.formatEmployee(emp),
      ),
      total,
      limit,
      offset,
    };
  }

  /**
   * 社員詳細を取得
   */
  async getEmployee(options: {
    employeeId?: string;
    id?: string;
  }): Promise<GetEmployeeResult> {
    if (!options.employeeId && !options.id) {
      return { success: false, error: "employeeId or id is required" };
    }

    const org = await this.getPublishedOrganization();
    if (!org) {
      return { success: false, error: "No published organization found" };
    }

    const where = options.employeeId
      ? { employeeId: options.employeeId, organizationId: org.id }
      : { id: options.id, organizationId: org.id };

    const employee = await this.prisma.employee.findFirst({
      where,
      include: {
        department: { select: { name: true } },
        section: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    return {
      success: true,
      employee: this.formatEmployee(employee),
    };
  }

  /**
   * 社員を検索
   */
  async searchEmployees(query: string): Promise<SearchEmployeesResult> {
    const org = await this.getPublishedOrganization();
    if (!org) {
      return { success: false, error: "No published organization found" };
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nameKana: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { employeeId: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        department: { select: { name: true } },
        section: { select: { name: true } },
        course: { select: { name: true } },
      },
      orderBy: { employeeId: "asc" },
      take: 50,
    });

    return {
      success: true,
      employees: employees.map(
        (emp: (typeof employees)[number]) => this.formatEmployee(emp),
      ),
    };
  }

  /**
   * 接続を閉じる
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
