/**
 * 組織図ページの多言語翻訳
 */

export const translations = {
  en: {
    title: "Organization Chart",
    searchPlaceholder: "Search by name or employee ID...",
    allDepartments: "All Departments",
    allPositions: "All Positions",
    activeOnly: "Active Only",
    showAll: "Show All",
    employees: "employees",
    employee: "employee",
    noEmployees: "No employees found",
    noEmployeesDescription: "No employees match the current filters.",
    loading: "Loading...",
    error: "Error loading data",
    retry: "Retry",
    // Tree view
    expandAll: "Expand All",
    collapseAll: "Collapse All",
    // Employee card
    email: "Email",
    phone: "Phone",
    viewDetails: "View Details",
    // Employee detail dialog
    employeeDetails: "Employee Details",
    basicInfo: "Basic Information",
    name: "Name",
    nameKana: "Name (Kana)",
    employeeId: "Employee ID",
    position: "Position",
    qualificationGrade: "Qualification Grade",
    employmentType: "Employment Type",
    affiliation: "Affiliation",
    department: "Department",
    section: "Section",
    course: "Course",
    contactInfo: "Contact Information",
    otherInfo: "Other Information",
    joinDate: "Join Date",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    close: "Close",
    // Breadcrumb
    organization: "Organization",
    // Pagination
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    total: "Total",
    // Mobile
    selectOrganization: "Select Organization",
    // Display mode
    exclusiveMode: "Exclusive",
    exclusiveModeTooltip:
      "Show employees only at their direct level (no duplicates)",
  },
  ja: {
    title: "組織図",
    searchPlaceholder: "名前・社員番号で検索...",
    allDepartments: "すべての本部",
    allPositions: "すべての役職",
    activeOnly: "在籍中のみ",
    showAll: "全て表示",
    employees: "名",
    employee: "名",
    noEmployees: "社員が見つかりません",
    noEmployeesDescription: "現在のフィルター条件に一致する社員がいません。",
    loading: "読み込み中...",
    error: "データの読み込みに失敗しました",
    retry: "再試行",
    // Tree view
    expandAll: "すべて展開",
    collapseAll: "すべて折りたたむ",
    // Employee card
    email: "メール",
    phone: "電話",
    viewDetails: "詳細を見る",
    // Employee detail dialog
    employeeDetails: "社員詳細",
    basicInfo: "基本情報",
    name: "氏名",
    nameKana: "フリガナ",
    employeeId: "社員番号",
    position: "役職",
    qualificationGrade: "資格等級",
    employmentType: "雇用区分",
    affiliation: "所属",
    department: "本部",
    section: "部",
    course: "課",
    contactInfo: "連絡先",
    otherInfo: "その他",
    joinDate: "入社日",
    status: "ステータス",
    active: "在籍中",
    inactive: "退職",
    close: "閉じる",
    // Breadcrumb
    organization: "組織",
    // Pagination
    previous: "前へ",
    next: "次へ",
    page: "ページ",
    of: "/",
    total: "合計",
    // Mobile
    selectOrganization: "組織を選択",
    // Display mode
    exclusiveMode: "重複しない",
    exclusiveModeTooltip: "各社員を所属階層のみに表示（評価関係表示）",
  },
} as const;

export type Language = keyof typeof translations;
export type Translations = (typeof translations)[Language];
