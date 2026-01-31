import { ChangeType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Types
export interface MergeCandidate {
  id: string;
  name: string;
  employeeCount: number;
  departmentCount: number;
  status: string;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  sections: SectionInfo[];
}

export interface SectionInfo {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
  courses: CourseInfo[];
}

export interface CourseInfo {
  id: string;
  name: string;
  code: string | null;
  employeeCount: number;
}

export interface DepartmentMapping {
  sourceDeptId: string;
  targetDeptId: string | null; // null = create new
  sourceDeptName: string;
  targetDeptName?: string;
}

export interface SuggestedMapping {
  sourceDeptId: string;
  targetDeptId: string | null;
  matchType: "exact" | "partial" | "none";
}

export interface MergePreview {
  employeesToTransfer: number;
  departmentsToMerge: number;
  departmentsToCreate: number;
  sectionsToCreate: number;
  coursesToCreate: number;
  employees: {
    employeeId: string;
    name: string;
    sourceDept: string;
    sourceSection?: string;
    sourceCourse?: string;
    targetDept: string;
    targetSection?: string;
    targetCourse?: string;
  }[];
  warnings: string[];
}

export interface MergeResult {
  success: boolean;
  batchId: string;
  statistics: {
    employeesTransferred: number;
    departmentsMerged: number;
    departmentsCreated: number;
    sectionsCreated: number;
    coursesCreated: number;
  };
}

export interface DuplicateEmployee {
  sourceEmployee: {
    id: string;
    employeeId: string;
    name: string;
    position: string | null;
    department: string;
    section: string | null;
    email: string | null;
  };
  targetEmployee: {
    id: string;
    employeeId: string;
    name: string;
    position: string | null;
    department: string;
    section: string | null;
    email: string | null;
  };
}

export type DuplicateResolution = "keepTarget" | "keepSource" | "skipSource";

export interface DuplicateResolutionMap {
  [sourceEmployeeId: string]: DuplicateResolution;
}

/**
 * Get merge candidate organizations (excluding the target organization)
 */
export async function getMergeCandidates(
  targetOrgId: string,
): Promise<MergeCandidate[]> {
  const organizations = await prisma.organization.findMany({
    where: {
      id: { not: targetOrgId },
      status: { not: "ARCHIVED" },
    },
    include: {
      _count: {
        select: {
          employees: { where: { isActive: true } },
          departments: true,
        },
      },
    },
  });

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    employeeCount: org._count.employees,
    departmentCount: org._count.departments,
    status: org.status,
  }));
}

/**
 * Get department mapping data for source and target organizations
 */
export async function getDepartmentMappingData(
  sourceOrgId: string,
  targetOrgId: string,
): Promise<{
  sourceDepartments: DepartmentInfo[];
  targetDepartments: DepartmentInfo[];
  suggestedMappings: SuggestedMapping[];
}> {
  const [sourceOrg, targetOrg] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: sourceOrgId },
      include: {
        departments: {
          include: {
            _count: {
              select: { employees: { where: { isActive: true } } },
            },
            sections: {
              include: {
                _count: {
                  select: { employees: { where: { isActive: true } } },
                },
                courses: {
                  include: {
                    _count: {
                      select: { employees: { where: { isActive: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.organization.findUnique({
      where: { id: targetOrgId },
      include: {
        departments: {
          include: {
            _count: {
              select: { employees: { where: { isActive: true } } },
            },
            sections: {
              include: {
                _count: {
                  select: { employees: { where: { isActive: true } } },
                },
                courses: {
                  include: {
                    _count: {
                      select: { employees: { where: { isActive: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!sourceOrg || !targetOrg) {
    throw new Error("Source or target organization not found");
  }

  const sourceDepartments: DepartmentInfo[] = sourceOrg.departments.map(
    (dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount: dept._count.employees,
      sections: dept.sections.map((sect) => ({
        id: sect.id,
        name: sect.name,
        code: sect.code,
        employeeCount: sect._count.employees,
        courses: sect.courses.map((course) => ({
          id: course.id,
          name: course.name,
          code: course.code,
          employeeCount: course._count.employees,
        })),
      })),
    }),
  );

  const targetDepartments: DepartmentInfo[] = targetOrg.departments.map(
    (dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount: dept._count.employees,
      sections: dept.sections.map((sect) => ({
        id: sect.id,
        name: sect.name,
        code: sect.code,
        employeeCount: sect._count.employees,
        courses: sect.courses.map((course) => ({
          id: course.id,
          name: course.name,
          code: course.code,
          employeeCount: course._count.employees,
        })),
      })),
    }),
  );

  // Generate suggested mappings based on name matching
  const suggestedMappings: SuggestedMapping[] = sourceDepartments.map(
    (sourceDept) => {
      // Look for exact name match
      const exactMatch = targetDepartments.find(
        (td) => td.name.toLowerCase() === sourceDept.name.toLowerCase(),
      );

      if (exactMatch) {
        return {
          sourceDeptId: sourceDept.id,
          targetDeptId: exactMatch.id,
          matchType: "exact" as const,
        };
      }

      // Look for partial name match (contains)
      const partialMatch = targetDepartments.find(
        (td) =>
          td.name.toLowerCase().includes(sourceDept.name.toLowerCase()) ||
          sourceDept.name.toLowerCase().includes(td.name.toLowerCase()),
      );

      if (partialMatch) {
        return {
          sourceDeptId: sourceDept.id,
          targetDeptId: partialMatch.id,
          matchType: "partial" as const,
        };
      }

      // No match found - will create new
      return {
        sourceDeptId: sourceDept.id,
        targetDeptId: null,
        matchType: "none" as const,
      };
    },
  );

  return {
    sourceDepartments,
    targetDepartments,
    suggestedMappings,
  };
}

/**
 * Detect duplicate employees between source and target organizations by name matching
 */
export async function detectDuplicateEmployees(
  sourceOrgId: string,
  targetOrgId: string,
): Promise<DuplicateEmployee[]> {
  const [sourceEmployees, targetEmployees] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: sourceOrgId, isActive: true },
      include: { department: true, section: true },
    }),
    prisma.employee.findMany({
      where: { organizationId: targetOrgId, isActive: true },
      include: { department: true, section: true },
    }),
  ]);

  const duplicates: DuplicateEmployee[] = [];

  for (const sourceEmp of sourceEmployees) {
    const matchingTarget = targetEmployees.find(
      (t) => t.name === sourceEmp.name,
    );
    if (matchingTarget) {
      duplicates.push({
        sourceEmployee: {
          id: sourceEmp.id,
          employeeId: sourceEmp.employeeId,
          name: sourceEmp.name,
          position: sourceEmp.position,
          department: sourceEmp.department.name,
          section: sourceEmp.section?.name || null,
          email: sourceEmp.email,
        },
        targetEmployee: {
          id: matchingTarget.id,
          employeeId: matchingTarget.employeeId,
          name: matchingTarget.name,
          position: matchingTarget.position,
          department: matchingTarget.department.name,
          section: matchingTarget.section?.name || null,
          email: matchingTarget.email,
        },
      });
    }
  }

  return duplicates;
}

/**
 * Generate merge preview based on department mappings
 */
export async function generateMergePreview(
  sourceOrgId: string,
  targetOrgId: string,
  departmentMappings: DepartmentMapping[],
  duplicateResolutions?: DuplicateResolutionMap,
): Promise<MergePreview> {
  const warnings: string[] = [];

  // Get source employees
  const sourceEmployees = await prisma.employee.findMany({
    where: {
      organizationId: sourceOrgId,
      isActive: true,
    },
    include: {
      department: true,
      section: true,
      course: true,
    },
  });

  // Get target organization employees to check for duplicate employee IDs
  const targetEmployees = await prisma.employee.findMany({
    where: {
      organizationId: targetOrgId,
      isActive: true,
    },
    select: { employeeId: true },
  });

  const targetEmployeeIds = new Set(targetEmployees.map((e) => e.employeeId));

  // Check for duplicates
  const duplicates = sourceEmployees.filter((e) =>
    targetEmployeeIds.has(e.employeeId),
  );
  if (duplicates.length > 0) {
    warnings.push(
      `Duplicate employee IDs found: ${duplicates.map((e) => e.employeeId).join(", ")}`,
    );
  }

  // Filter out employees based on duplicate resolutions
  const filteredSourceEmployees = duplicateResolutions
    ? sourceEmployees.filter((emp) => {
        const resolution = duplicateResolutions[emp.id];
        // keepTarget or skipSource means don't transfer this employee
        if (resolution === "keepTarget" || resolution === "skipSource") {
          return false;
        }
        return true;
      })
    : sourceEmployees;

  // Get target departments and their sections/courses
  const targetDepartments = await prisma.department.findMany({
    where: { organizationId: targetOrgId },
    include: {
      sections: {
        include: {
          courses: true,
        },
      },
    },
  });

  // Get source departments for mapping
  const sourceDepartments = await prisma.department.findMany({
    where: { organizationId: sourceOrgId },
    include: {
      sections: {
        include: {
          courses: true,
        },
      },
    },
  });

  const mappingById = new Map(
    departmentMappings.map((m) => [m.sourceDeptId, m]),
  );

  // Calculate statistics
  let departmentsToMerge = 0;
  let departmentsToCreate = 0;
  let sectionsToCreate = 0;
  let coursesToCreate = 0;

  for (const sourceDept of sourceDepartments) {
    const mapping = mappingById.get(sourceDept.id);

    if (mapping?.targetDeptId) {
      departmentsToMerge++;

      // Check if sections need to be created
      const targetDept = targetDepartments.find(
        (d) => d.id === mapping.targetDeptId,
      );
      if (targetDept) {
        for (const sourceSection of sourceDept.sections) {
          const matchingSection = targetDept.sections.find(
            (s) => s.name.toLowerCase() === sourceSection.name.toLowerCase(),
          );
          if (!matchingSection) {
            sectionsToCreate++;
            coursesToCreate += sourceSection.courses.length;
          } else {
            // Check courses
            for (const sourceCourse of sourceSection.courses) {
              const matchingCourse = matchingSection.courses.find(
                (c) => c.name.toLowerCase() === sourceCourse.name.toLowerCase(),
              );
              if (!matchingCourse) {
                coursesToCreate++;
              }
            }
          }
        }
      }
    } else {
      departmentsToCreate++;
      sectionsToCreate += sourceDept.sections.length;
      sourceDept.sections.forEach((s) => {
        coursesToCreate += s.courses.length;
      });
    }
  }

  // Build employee transfer list
  const employees = filteredSourceEmployees.map((emp) => {
    const mapping = mappingById.get(emp.departmentId);
    const targetDeptId = mapping?.targetDeptId;

    let targetDept = mapping?.sourceDeptName || emp.department.name;
    let targetSection = emp.section?.name;
    let targetCourse = emp.course?.name;

    if (targetDeptId) {
      const td = targetDepartments.find((d) => d.id === targetDeptId);
      if (td) {
        targetDept = td.name;

        // Find matching section
        if (emp.section) {
          const empSectionName = emp.section.name;
          const matchingSection = td.sections.find(
            (s) => s.name.toLowerCase() === empSectionName.toLowerCase(),
          );
          if (matchingSection) {
            targetSection = matchingSection.name;
            // Find matching course
            if (emp.course) {
              const empCourseName = emp.course.name;
              const matchingCourse = matchingSection.courses.find(
                (c) => c.name.toLowerCase() === empCourseName.toLowerCase(),
              );
              if (matchingCourse) {
                targetCourse = matchingCourse.name;
              }
            }
          }
        }
      }
    }

    return {
      employeeId: emp.employeeId,
      name: emp.name,
      sourceDept: emp.department.name,
      sourceSection: emp.section?.name,
      sourceCourse: emp.course?.name,
      targetDept,
      targetSection,
      targetCourse,
    };
  });

  return {
    employeesToTransfer: filteredSourceEmployees.length,
    departmentsToMerge,
    departmentsToCreate,
    sectionsToCreate,
    coursesToCreate,
    employees,
    warnings,
  };
}

/**
 * Execute the organization merge
 */
export async function executeMerge(
  sourceOrgId: string,
  targetOrgId: string,
  departmentMappings: DepartmentMapping[],
  changedBy: string,
  duplicateResolutions?: DuplicateResolutionMap,
): Promise<MergeResult> {
  const batchId = randomUUID();
  const now = new Date();

  // Statistics
  let employeesTransferred = 0;
  let departmentsMerged = 0;
  let departmentsCreated = 0;
  let sectionsCreated = 0;
  let coursesCreated = 0;

  await prisma.$transaction(async (tx) => {
    // Get source and target organizations
    const [sourceOrg, targetOrg] = await Promise.all([
      tx.organization.findUnique({
        where: { id: sourceOrgId },
        include: {
          departments: {
            include: {
              sections: {
                include: {
                  courses: true,
                },
              },
            },
          },
          employees: {
            where: { isActive: true },
            include: {
              department: true,
              section: true,
              course: true,
            },
          },
        },
      }),
      tx.organization.findUnique({
        where: { id: targetOrgId },
        include: {
          departments: {
            include: {
              sections: {
                include: {
                  courses: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!sourceOrg || !targetOrg) {
      throw new Error("Source or target organization not found");
    }

    // Build mapping from source to target structure
    const mappingById = new Map(
      departmentMappings.map((m) => [m.sourceDeptId, m]),
    );

    // Maps for tracking created/merged entities
    const deptIdMap = new Map<string, string>(); // sourceDeptId -> targetDeptId
    const sectionIdMap = new Map<string, string>(); // sourceSectionId -> targetSectionId
    const courseIdMap = new Map<string, string>(); // sourceCourseId -> targetCourseId

    // Process departments
    for (const sourceDept of sourceOrg.departments) {
      const mapping = mappingById.get(sourceDept.id);
      let targetDeptId: string;

      if (mapping?.targetDeptId) {
        // Merge with existing department
        targetDeptId = mapping.targetDeptId;
        departmentsMerged++;
      } else {
        // Create new department in target org
        const newDept = await tx.department.create({
          data: {
            name: sourceDept.name,
            code: sourceDept.code,
            description: sourceDept.description,
            organizationId: targetOrgId,
          },
        });
        targetDeptId = newDept.id;
        departmentsCreated++;

        // Log change
        await tx.changeLog.create({
          data: {
            entityType: "Department",
            entityId: newDept.id,
            changeType: ChangeType.CREATE,
            changeDescription: `Created department ${sourceDept.name} from merge`,
            batchId,
            changedBy,
            changedAt: now,
          },
        });
      }

      deptIdMap.set(sourceDept.id, targetDeptId);

      // Process sections
      const targetDept = targetOrg.departments.find(
        (d) => d.id === targetDeptId,
      ) || { sections: [] };

      for (const sourceSection of sourceDept.sections) {
        // Try to find matching section by name
        const matchingSection = targetDept.sections.find(
          (s) => s.name.toLowerCase() === sourceSection.name.toLowerCase(),
        );

        let targetSectionId: string;

        if (matchingSection) {
          targetSectionId = matchingSection.id;
        } else {
          // Create new section
          const newSection = await tx.section.create({
            data: {
              name: sourceSection.name,
              code: sourceSection.code,
              description: sourceSection.description,
              departmentId: targetDeptId,
            },
          });
          targetSectionId = newSection.id;
          sectionsCreated++;

          // Log change
          await tx.changeLog.create({
            data: {
              entityType: "Section",
              entityId: newSection.id,
              changeType: ChangeType.CREATE,
              changeDescription: `Created section ${sourceSection.name} from merge`,
              batchId,
              changedBy,
              changedAt: now,
            },
          });
        }

        sectionIdMap.set(sourceSection.id, targetSectionId);

        // Process courses
        const targetSection = matchingSection || { courses: [] };

        for (const sourceCourse of sourceSection.courses) {
          // Try to find matching course by name
          const matchingCourse = targetSection.courses?.find(
            (c: { name: string }) =>
              c.name.toLowerCase() === sourceCourse.name.toLowerCase(),
          );

          let targetCourseId: string;

          if (matchingCourse) {
            targetCourseId = matchingCourse.id;
          } else {
            // Create new course
            const newCourse = await tx.course.create({
              data: {
                name: sourceCourse.name,
                code: sourceCourse.code,
                description: sourceCourse.description,
                sectionId: targetSectionId,
              },
            });
            targetCourseId = newCourse.id;
            coursesCreated++;

            // Log change
            await tx.changeLog.create({
              data: {
                entityType: "Course",
                entityId: newCourse.id,
                changeType: ChangeType.CREATE,
                changeDescription: `Created course ${sourceCourse.name} from merge`,
                batchId,
                changedBy,
                changedAt: now,
              },
            });
          }

          courseIdMap.set(sourceCourse.id, targetCourseId);
        }
      }
    }

    // Transfer employees
    for (const emp of sourceOrg.employees) {
      // Check duplicate resolution
      const resolution = duplicateResolutions?.[emp.id];
      if (resolution === "keepTarget" || resolution === "skipSource") {
        // Don't transfer this employee - deactivate in source
        await tx.employee.update({
          where: { id: emp.id },
          data: { isActive: false },
        });
        continue;
      }

      if (resolution === "keepSource") {
        // Find and deactivate the target employee with the same name
        const targetDup = await tx.employee.findFirst({
          where: {
            organizationId: targetOrgId,
            name: emp.name,
            isActive: true,
          },
        });
        if (targetDup) {
          await tx.employee.update({
            where: { id: targetDup.id },
            data: { isActive: false },
          });
          await tx.changeLog.create({
            data: {
              entityType: "Employee",
              entityId: targetDup.id,
              changeType: ChangeType.UPDATE,
              fieldName: "isActive",
              oldValue: "true",
              newValue: "false",
              changeDescription: `Deactivated due to merge - replaced by source employee ${emp.employeeId}`,
              batchId,
              changedBy,
              changedAt: now,
            },
          });
        }
      }

      const targetDeptId = deptIdMap.get(emp.departmentId);
      const targetSectionId = emp.sectionId
        ? sectionIdMap.get(emp.sectionId)
        : null;
      const targetCourseId = emp.courseId
        ? courseIdMap.get(emp.courseId)
        : null;

      if (!targetDeptId) {
        throw new Error(
          `Department mapping not found for employee ${emp.employeeId}`,
        );
      }

      // Get target department name for history
      const targetDept = await tx.department.findUnique({
        where: { id: targetDeptId },
      });
      const targetSection = targetSectionId
        ? await tx.section.findUnique({ where: { id: targetSectionId } })
        : null;
      const targetCourse = targetCourseId
        ? await tx.course.findUnique({ where: { id: targetCourseId } })
        : null;

      // Update employee
      await tx.employee.update({
        where: { id: emp.id },
        data: {
          organizationId: targetOrgId,
          departmentId: targetDeptId,
          sectionId: targetSectionId || null,
          courseId: targetCourseId || null,
        },
      });

      // Create employee history
      await tx.employeeHistory.create({
        data: {
          employeeId: emp.id,
          validFrom: now,
          name: emp.name,
          nameKana: emp.nameKana,
          email: emp.email || "",
          profileImage: emp.profileImage,
          phone: emp.phone,
          position: emp.position,
          positionCode: emp.positionCode,
          qualificationGrade: emp.qualificationGrade,
          qualificationGradeCode: emp.qualificationGradeCode,
          employmentType: emp.employmentType,
          employmentTypeCode: emp.employmentTypeCode,
          departmentCode: emp.departmentCode,
          joinDate: emp.joinDate,
          birthDate: emp.birthDate,
          isActive: emp.isActive,
          organizationId: targetOrgId,
          departmentId: targetDeptId,
          departmentName: targetDept?.name || "",
          sectionId: targetSectionId,
          sectionName: targetSection?.name,
          courseId: targetCourseId,
          courseName: targetCourse?.name,
          changeType: ChangeType.TRANSFER,
          changeReason: `Organization merge from ${sourceOrg.name}`,
          changedBy,
          changedAt: now,
        },
      });

      // Create change log
      await tx.changeLog.create({
        data: {
          entityType: "Employee",
          entityId: emp.id,
          changeType: ChangeType.TRANSFER,
          fieldName: "organizationId",
          oldValue: sourceOrgId,
          newValue: targetOrgId,
          changeDescription: `Transferred from ${sourceOrg.name} to ${targetOrg.name}`,
          batchId,
          changedBy,
          changedAt: now,
        },
      });

      employeesTransferred++;
    }

    // Archive source organization
    await tx.organization.update({
      where: { id: sourceOrgId },
      data: {
        status: "ARCHIVED",
      },
    });

    // Log organization archive
    await tx.changeLog.create({
      data: {
        entityType: "Organization",
        entityId: sourceOrgId,
        changeType: ChangeType.UPDATE,
        fieldName: "status",
        oldValue: sourceOrg.status,
        newValue: "ARCHIVED",
        changeDescription: `Archived after merge into ${targetOrg.name}`,
        batchId,
        changedBy,
        changedAt: now,
      },
    });
  });

  return {
    success: true,
    batchId,
    statistics: {
      employeesTransferred,
      departmentsMerged,
      departmentsCreated,
      sectionsCreated,
      coursesCreated,
    },
  };
}
