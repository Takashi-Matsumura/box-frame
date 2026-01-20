export const ticketSalesTranslations = {
  en: {
    pageTitle: "Internal Ticket Sales",
    description: "Manage internal ticket sales, customers, and products",

    // タブ
    tabCustomers: "Customers",
    tabProducts: "Products",
    tabSales: "Sales Records",

    // 顧客管理
    customersTitle: "Customer Management",
    addCustomer: "Add Customer",
    editCustomer: "Edit Customer",
    deleteCustomer: "Delete Customer",
    customerName: "Name",
    customerId: "Customer ID",
    nfcId: "NFC ID",
    email: "Email",
    company: "Company",
    paymentDay: "Payment Day",
    hasApproval: "Approved",
    linkedEmployee: "Linked Employee",
    allCompanies: "All Companies",
    showInactive: "Show Inactive",

    // 商品管理
    productsTitle: "Product Management",
    addProduct: "Add Product",
    editProduct: "Edit Product",
    productCode: "Code",
    productName: "Name",
    productNameJa: "Name (Japanese)",
    unitPrice: "Unit Price",
    sortOrder: "Sort Order",

    // 販売記録
    salesTitle: "Sales Records",
    soldAt: "Sold At",
    customerNameLabel: "Customer",
    productNameLabel: "Product",
    quantity: "Quantity",
    totalPrice: "Total",
    paymentMethod: "Payment",
    admin: "Admin",
    exportCsv: "Export CSV",
    dateRange: "Date Range",
    from: "From",
    to: "To",
    deleteSale: "Cancel Sale",
    confirmDeleteSale: "Are you sure you want to cancel this sale?",

    // 支払方法
    paymentCash: "Cash",
    paymentPayroll: "Payroll Deduction",
    allPaymentMethods: "All Payment Methods",

    // 共通
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    active: "Active",
    inactive: "Inactive",
    search: "Search",
    filter: "Filter",
    noData: "No data found",
    loading: "Loading...",
    actions: "Actions",
    yen: "¥",

    // メッセージ
    saveSuccess: "Saved successfully",
    saveError: "Failed to save",
    deleteSuccess: "Deleted successfully",
    deleteError: "Failed to delete",
    deleteConfirm: "Are you sure you want to delete this item?",
    fetchError: "Failed to fetch data",
  },
  ja: {
    pageTitle: "社内チケット販売",
    description: "社内チケット販売、顧客、商品を管理します",

    // タブ
    tabCustomers: "顧客管理",
    tabProducts: "商品管理",
    tabSales: "販売記録",

    // 顧客管理
    customersTitle: "顧客管理",
    addCustomer: "顧客を追加",
    editCustomer: "顧客を編集",
    deleteCustomer: "顧客を削除",
    customerName: "氏名",
    customerId: "顧客ID",
    nfcId: "NFC ID",
    email: "メールアドレス",
    company: "所属",
    paymentDay: "給与締め日",
    hasApproval: "承認済み",
    linkedEmployee: "社員紐付け",
    allCompanies: "すべての所属",
    showInactive: "無効を表示",

    // 商品管理
    productsTitle: "商品管理",
    addProduct: "商品を追加",
    editProduct: "商品を編集",
    productCode: "コード",
    productName: "商品名",
    productNameJa: "商品名（日本語）",
    unitPrice: "単価",
    sortOrder: "表示順",

    // 販売記録
    salesTitle: "販売記録",
    soldAt: "販売日時",
    customerNameLabel: "顧客",
    productNameLabel: "商品",
    quantity: "数量",
    totalPrice: "合計",
    paymentMethod: "支払方法",
    admin: "販売担当",
    exportCsv: "CSV出力",
    dateRange: "期間",
    from: "開始日",
    to: "終了日",
    deleteSale: "販売取消",
    confirmDeleteSale: "この販売を取り消してもよろしいですか？",

    // 支払方法
    paymentCash: "現金",
    paymentPayroll: "給与天引き",
    allPaymentMethods: "すべての支払方法",

    // 共通
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    active: "有効",
    inactive: "無効",
    search: "検索",
    filter: "フィルタ",
    noData: "データがありません",
    loading: "読み込み中...",
    actions: "操作",
    yen: "円",

    // メッセージ
    saveSuccess: "保存しました",
    saveError: "保存に失敗しました",
    deleteSuccess: "削除しました",
    deleteError: "削除に失敗しました",
    deleteConfirm: "この項目を削除してもよろしいですか？",
    fetchError: "データの取得に失敗しました",
  },
} as const;

export type TicketSalesTranslationKeys =
  keyof (typeof ticketSalesTranslations)["en"];
