import { PrismaClient } from "@prisma/client";
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
export declare class DbClient {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * 環境変数からPrismaClientを初期化してインスタンスを作成
     */
    static createFromEnv(): DbClient;
    /**
     * DB接続が利用可能かチェック
     */
    isAvailable(): Promise<boolean>;
    /**
     * PUBLISHED状態の組織を取得（内部ヘルパー）
     */
    private getPublishedOrganization;
    /**
     * マネージャー情報をフォーマット
     */
    private formatManager;
    /**
     * 社員情報をフォーマット
     */
    private formatEmployee;
    /**
     * 組織階層ツリーを取得
     */
    getStructure(): Promise<{
        success: boolean;
        organization?: {
            id: string;
            name: string;
            status: string;
        };
        departments?: DepartmentNode[];
        totalEmployees?: number;
        error?: string;
    }>;
    /**
     * 本部一覧を取得
     */
    listDepartments(): Promise<{
        success: boolean;
        departments?: DepartmentSummary[];
        error?: string;
    }>;
    /**
     * 社員一覧を取得
     */
    listEmployees(options?: {
        departmentId?: string;
        sectionId?: string;
        courseId?: string;
        limit?: number;
        offset?: number;
    }): Promise<ListEmployeesResult>;
    /**
     * 社員詳細を取得
     */
    getEmployee(options: {
        employeeId?: string;
        id?: string;
    }): Promise<GetEmployeeResult>;
    /**
     * 社員を検索
     */
    searchEmployees(query: string): Promise<SearchEmployeesResult>;
    /**
     * 接続を閉じる
     */
    disconnect(): Promise<void>;
}
