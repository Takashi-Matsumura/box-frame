"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { translations, type Language, type Translations } from "./translations";
import { OrgTreeView } from "./components/OrgTreeView";
import { MemberGrid } from "./components/MemberGrid";
import { OrgBreadcrumb } from "./components/OrgBreadcrumb";
import { EmployeeDetailDialog } from "./components/EmployeeDetailDialog";
import { EXECUTIVES_DEPARTMENT_NAME } from "@/lib/importers/organization/parser";

// 型定義
interface Manager {
  id: string;
  name: string;
  position: string;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  manager: Manager | null;
}

interface Section {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  courses: Course[];
  manager: Manager | null;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  sections: Section[];
  manager: Manager | null;
}

interface Organization {
  id: string;
  name: string;
  employeeCount: number;
}

interface OrganizationData {
  organization: Organization | null;
  departments: Department[];
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  email: string | null;
  phone: string | null;
  position: string;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
  isActive: boolean;
  joinDate: string | null;
}

interface EmployeesResponse {
  employees: Employee[];
  total: number;
  page: number;
  totalPages: number;
  positions: string[];
}

// 選択状態の型
interface Selection {
  departmentId: string | null;
  departmentName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  courseId: string | null;
  courseName: string | null;
}

interface OrganizationChartClientProps {
  language: Language;
}

export function OrganizationChartClient({
  language,
}: OrganizationChartClientProps) {
  const t: Translations = translations[language];
  const isTabletOrMobile = useIsTabletOrMobile();

  // 組織データ
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  // 社員データ
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [positions, setPositions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // フィルター
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [exclusiveMode, setExclusiveMode] = useState(false);

  // 選択状態
  const [selection, setSelection] = useState<Selection>({
    departmentId: null,
    departmentName: null,
    sectionId: null,
    sectionName: null,
    courseId: null,
    courseName: null,
  });

  // 社員詳細ダイアログ
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );

  // モバイルメニュー
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 組織データの取得
  const fetchOrgData = useCallback(async () => {
    try {
      setOrgLoading(true);
      setOrgError(null);
      const response = await fetch("/api/organization");
      if (!response.ok) throw new Error("Failed to fetch organization data");
      const data: OrganizationData = await response.json();
      setOrgData(data);
    } catch (error) {
      setOrgError(t.error);
      console.error("Error fetching organization data:", error);
    } finally {
      setOrgLoading(false);
    }
  }, [t.error]);

  // 社員データの取得
  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const params = new URLSearchParams();

      if (selection.courseId) {
        params.set("courseId", selection.courseId);
      } else if (selection.sectionId) {
        params.set("sectionId", selection.sectionId);
      } else if (selection.departmentId) {
        params.set("departmentId", selection.departmentId);
      }

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (positionFilter !== "all") {
        params.set("position", positionFilter);
      }
      if (showInactive) {
        params.set("isActive", "all");
      }
      if (exclusiveMode) {
        params.set("exclusiveMode", "true");
      }
      params.set("page", page.toString());
      params.set("limit", "50");

      const response = await fetch(`/api/organization/employees?${params}`);
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data: EmployeesResponse = await response.json();

      setEmployees(data.employees);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.positions.length > 0) {
        setPositions(data.positions);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setEmployeesLoading(false);
    }
  }, [
    selection,
    debouncedSearch,
    positionFilter,
    showInactive,
    exclusiveMode,
    page,
  ]);

  // 初期データ取得
  useEffect(() => {
    fetchOrgData();
  }, [fetchOrgData]);

  // 社員データの取得（依存値変更時）
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ツリーノード選択ハンドラ
  const handleSelectNode = useCallback(
    (
      type: "organization" | "department" | "section" | "course",
      id: string | null,
      name: string | null
    ) => {
      setPage(1);

      switch (type) {
        case "organization":
          setSelection({
            departmentId: null,
            departmentName: null,
            sectionId: null,
            sectionName: null,
            courseId: null,
            courseName: null,
          });
          break;
        case "department":
          setSelection({
            departmentId: id,
            departmentName: name,
            sectionId: null,
            sectionName: null,
            courseId: null,
            courseName: null,
          });
          break;
        case "section":
          setSelection((prev) => ({
            ...prev,
            sectionId: id,
            sectionName: name,
            courseId: null,
            courseName: null,
          }));
          break;
        case "course":
          setSelection((prev) => ({
            ...prev,
            courseId: id,
            courseName: name,
          }));
          break;
      }

      if (isTabletOrMobile) {
        setMobileMenuOpen(false);
      }
    },
    [isTabletOrMobile]
  );

  // ページ変更ハンドラ
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Sort departments with "役員・顧問" last
  const sortedDepartments = useMemo(() => {
    if (!orgData?.departments) return [];
    return [...orgData.departments].sort((a, b) => {
      // "役員・顧問" を最後に
      if (a.name === EXECUTIVES_DEPARTMENT_NAME) return 1;
      if (b.name === EXECUTIVES_DEPARTMENT_NAME) return -1;
      // それ以外はコード順（元の順序を維持）
      return 0;
    });
  }, [orgData?.departments]);

  // ツリービューコンポーネント
  const treeView = (
    <OrgTreeView
      organization={orgData?.organization || null}
      departments={sortedDepartments}
      selection={selection}
      onSelectNode={handleSelectNode}
      loading={orgLoading}
      error={orgError}
      onRetry={fetchOrgData}
      t={t}
      language={language}
    />
  );

  return (
    <div className="max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-6">
          {/* 検索・フィルターバー */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            {/* モバイル: 組織選択ボタン */}
            {isTabletOrMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    {t.selectOrganization}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="p-4 pb-0">
                    <SheetTitle>{t.selectOrganization}</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100%-60px)] p-4">{treeView}</ScrollArea>
                </SheetContent>
              </Sheet>
            )}

            {/* 検索入力 */}
            <div className="flex-1 w-full sm:max-w-sm">
              <Input
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* 役職フィルター */}
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t.allPositions} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allPositions}</SelectItem>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 在籍ステータスフィルター */}
            <Button
              variant={showInactive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowInactive(!showInactive);
                setPage(1);
              }}
            >
              {showInactive ? t.showAll : t.activeOnly}
            </Button>
          </div>

          {/* メインコンテンツ */}
          <div className="flex gap-6">
            {/* デスクトップ: 左パネル（ツリービュー） */}
            {!isTabletOrMobile && (
              <div className="w-[300px] flex-shrink-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {treeView}
                </ScrollArea>
              </div>
            )}

            {/* 右パネル（メンバーグリッド） */}
            <div className="flex-1 min-w-0">
              {/* パンくずリスト & 表示モード切替 */}
              <div className="flex items-center justify-between mb-2">
                <OrgBreadcrumb
                  organization={orgData?.organization || null}
                  selection={selection}
                  onSelectNode={handleSelectNode}
                  t={t}
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Label
                    htmlFor="exclusive-mode"
                    className="text-sm text-muted-foreground cursor-pointer"
                    title={t.exclusiveModeTooltip}
                  >
                    {t.exclusiveMode}
                  </Label>
                  <Switch
                    id="exclusive-mode"
                    checked={exclusiveMode}
                    onCheckedChange={(checked) => {
                      setExclusiveMode(checked);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* 合計表示 & ページネーション */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {t.total}: {total}
                  {language === "ja" ? t.employees : ` ${t.employees}`}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      {t.previous}
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {page} {t.of} {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                    >
                      {t.next}
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>

              {/* メンバーグリッド */}
              <MemberGrid
                employees={employees}
                loading={employeesLoading}
                onSelectEmployee={setSelectedEmployeeId}
                t={t}
                language={language}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 社員詳細ダイアログ */}
      <EmployeeDetailDialog
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        t={t}
        language={language}
      />
    </div>
  );
}
