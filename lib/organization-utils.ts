/**
 * 組織データのユーティリティ関数
 */

/**
 * 組織データを階層ごとにコード順（codeがnullの場合は名前順）でソート
 * @param organization 組織データ
 */
export function sortOrganizationHierarchy(organization: any) {
  if (!organization) return;

  // 部門をソート
  organization.departments.sort((a: any, b: any) => {
    const codeA = a.code || a.name;
    const codeB = b.code || b.name;
    return codeA.localeCompare(codeB, "ja");
  });

  // 部門ごとに部とコースをソート
  organization.departments.forEach((dept: any) => {
    dept.sections.sort((a: any, b: any) => {
      const codeA = a.code || a.name;
      const codeB = b.code || b.name;
      return codeA.localeCompare(codeB, "ja");
    });

    dept.sections.forEach((section: any) => {
      section.courses.sort((a: any, b: any) => {
        const codeA = a.code || a.name;
        const codeB = b.code || b.name;
        return codeA.localeCompare(codeB, "ja");
      });
    });
  });
}

/**
 * 一般社員（USER）向けに機密情報（birthDate, joinDate）を削除
 * @param organization 組織データ
 */
export function removeSensitiveEmployeeInfo(organization: any) {
  if (!organization) return;

  const removeSensitiveInfo = (employees: any[]) => {
    return employees.map((emp) => ({
      ...emp,
      birthDate: null,
      joinDate: null,
    }));
  };

  // 組織全体の社員情報から機密情報を削除
  organization.employees = removeSensitiveInfo(organization.employees);

  // 各階層の社員情報から機密情報を削除
  organization.departments.forEach((dept: any) => {
    dept.employees = removeSensitiveInfo(dept.employees);
    dept.sections.forEach((section: any) => {
      section.employees = removeSensitiveInfo(section.employees);
      section.courses.forEach((course: any) => {
        course.employees = removeSensitiveInfo(course.employees);
      });
    });
  });
}
