export const dataManagementTranslations = {
  en: {
    title: "Organization Data Management",
    import: "Import",
    employees: "Employees",
    history: "History",

    // Import Tab
    importTitle: "Import Organization Data",
    importDescription: "Upload CSV or Excel file to import employee data",
    selectFile: "Select File",
    dropFileHere: "Drop file here or click to select",
    supportedFormats: "Supported formats: CSV, XLSX",
    maxFileSize: "Max file size: 10MB",
    preview: "Preview",
    importData: "Import Data",
    importSuccess: "Import completed successfully",
    importError: "Import failed",

    // Preview
    previewTitle: "Import Preview",
    newEmployees: "New Employees",
    updatedEmployees: "Updated Employees",
    transferredEmployees: "Transferred Employees",
    retiredEmployees: "Retired Employees",
    errors: "Errors",
    noChanges: "No changes detected",
    confirm: "Confirm Import",
    cancel: "Cancel",
    close: "Close",

    // Employees Tab
    employeesTitle: "Employee List",
    search: "Search",
    searchPlaceholder: "Search by name, ID, or email...",
    filter: "Filter",
    department: "Department",
    section: "Section",
    course: "Course",
    position: "Position",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    all: "All",
    noEmployees: "No employees found",

    // History Tab
    historyTitle: "Change History",
    changeType: "Change Type",
    changedBy: "Changed By",
    changedAt: "Changed At",
    details: "Details",
    noHistory: "No history available",

    // Change Types
    create: "Create",
    update: "Update",
    delete: "Delete",
    transfer: "Transfer",
    promotion: "Promotion",
    retirement: "Retirement",
    rejoining: "Rejoining",
    importType: "Import",
    bulkUpdate: "Bulk Update",

    // Organization
    selectOrganization: "Select Organization",
    createOrganization: "Create Organization",
    organizationName: "Organization Name",
    noOrganization: "No organization available. Please create one first.",

    // Table Headers
    employeeId: "Employee ID",
    name: "Name",
    nameKana: "Name (Kana)",
    email: "Email",
    phone: "Phone",
    joinDate: "Join Date",

    // Actions
    loading: "Loading...",
    save: "Save",
    refresh: "Refresh",
    export: "Export",

    // Options
    markMissingAsRetired: "Mark missing employees as retired",
    markMissingAsRetiredDesc: "Employees not in the import file will be marked as retired",
  },
  ja: {
    title: "組織データ管理",
    import: "インポート",
    employees: "社員一覧",
    history: "履歴",

    // Import Tab
    importTitle: "組織データインポート",
    importDescription: "CSVまたはExcelファイルをアップロードして社員データをインポート",
    selectFile: "ファイルを選択",
    dropFileHere: "ここにファイルをドロップまたはクリックして選択",
    supportedFormats: "対応形式: CSV, XLSX",
    maxFileSize: "最大ファイルサイズ: 10MB",
    preview: "プレビュー",
    importData: "インポート実行",
    importSuccess: "インポートが完了しました",
    importError: "インポートに失敗しました",

    // Preview
    previewTitle: "インポートプレビュー",
    newEmployees: "新規社員",
    updatedEmployees: "更新社員",
    transferredEmployees: "異動社員",
    retiredEmployees: "退職社員",
    errors: "エラー",
    noChanges: "変更はありません",
    confirm: "インポート確定",
    cancel: "キャンセル",
    close: "閉じる",

    // Employees Tab
    employeesTitle: "社員一覧",
    search: "検索",
    searchPlaceholder: "氏名、社員番号、メールで検索...",
    filter: "フィルター",
    department: "本部",
    section: "部",
    course: "課",
    position: "役職",
    status: "状態",
    active: "在籍中",
    inactive: "退職",
    all: "すべて",
    noEmployees: "社員が見つかりません",

    // History Tab
    historyTitle: "変更履歴",
    changeType: "変更種別",
    changedBy: "変更者",
    changedAt: "変更日時",
    details: "詳細",
    noHistory: "履歴がありません",

    // Change Types
    create: "新規作成",
    update: "更新",
    delete: "削除",
    transfer: "異動",
    promotion: "昇進",
    retirement: "退職",
    rejoining: "復職",
    importType: "インポート",
    bulkUpdate: "一括更新",

    // Organization
    selectOrganization: "組織を選択",
    createOrganization: "組織を作成",
    organizationName: "組織名",
    noOrganization: "組織がありません。先に組織を作成してください。",

    // Table Headers
    employeeId: "社員番号",
    name: "氏名",
    nameKana: "氏名（フリガナ）",
    email: "メールアドレス",
    phone: "電話番号",
    joinDate: "入社年月日",

    // Actions
    loading: "読み込み中...",
    save: "保存",
    refresh: "更新",
    export: "エクスポート",

    // Options
    markMissingAsRetired: "インポートデータにない社員を退職扱いにする",
    markMissingAsRetiredDesc: "インポートファイルに含まれない社員は退職として処理されます",
  },
} as const;

export type DataManagementTranslation =
  | (typeof dataManagementTranslations)["en"]
  | (typeof dataManagementTranslations)["ja"];
