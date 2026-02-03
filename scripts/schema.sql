-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GUEST', 'USER', 'MANAGER', 'EXECUTIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "LdapMappingType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'SECURITY', 'ACTION', 'INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'TRANSFER', 'PROMOTION', 'RETIREMENT', 'REJOINING', 'IMPORT', 'BULK_UPDATE', 'EXPORT');

-- CreateEnum
CREATE TYPE "OrganizationLevel" AS ENUM ('COMPANY', 'DEPARTMENT', 'SECTION', 'COURSE');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('DIRECT', 'INDIRECT');

-- CreateEnum
CREATE TYPE "EvaluationPeriodStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ExclusionReason" AS ENUM ('MATERNITY_LEAVE', 'SICK_LEAVE', 'RESIGNATION', 'SECONDMENT', 'PROBATION', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessProcessStatus" AS ENUM ('DRAFT', 'EDITING', 'DIAGRAMMING', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TicketPaymentMethod" AS ENUM ('CASH', 'PAYROLL');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "language" TEXT NOT NULL DEFAULT 'ja',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "braveApiKey" TEXT,
    "systemPrompt" TEXT,
    "lastSignInAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "LdapConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serverUrl" TEXT NOT NULL DEFAULT '',
    "baseDN" TEXT NOT NULL DEFAULT '',
    "bindDN" TEXT,
    "bindPassword" TEXT,
    "searchFilter" TEXT NOT NULL DEFAULT '(uid={username})',
    "timeout" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "LdapConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LdapUserMapping" (
    "id" TEXT NOT NULL,
    "ldapUsername" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ldapDN" TEXT,
    "email" TEXT,
    "displayName" TEXT,
    "mappingType" "LdapMappingType" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "migrated" BOOLEAN NOT NULL DEFAULT false,
    "migratedAt" TIMESTAMP(3),
    "migratedFrom" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LdapUserMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LdapAuthLog" (
    "id" TEXT NOT NULL,
    "ldapUsername" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LdapAuthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenLdapConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "serverUrl" TEXT NOT NULL DEFAULT '',
    "adminDN" TEXT NOT NULL DEFAULT '',
    "adminPassword" TEXT NOT NULL DEFAULT '',
    "baseDN" TEXT NOT NULL DEFAULT '',
    "usersOU" TEXT NOT NULL DEFAULT '',
    "timeout" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenLdapConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyLdapConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serverUrl" TEXT NOT NULL DEFAULT '',
    "baseDN" TEXT NOT NULL DEFAULT '',
    "bindDN" TEXT,
    "bindPassword" TEXT,
    "searchFilter" TEXT NOT NULL DEFAULT '(uid={username})',
    "timeout" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyLdapConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "menuPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUserId" TEXT,
    "menuPaths" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessKeyPermission" (
    "id" TEXT NOT NULL,
    "accessKeyId" TEXT NOT NULL,
    "permissionId" TEXT,
    "granularity" TEXT NOT NULL DEFAULT 'menu',
    "moduleId" TEXT,
    "menuPath" TEXT,
    "tabId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessKeyPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessKeyId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "titleJa" TEXT,
    "message" TEXT NOT NULL,
    "messageJa" TEXT,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "actionLabelJa" TEXT,
    "source" TEXT,
    "sourceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "userId" TEXT,
    "targetId" TEXT,
    "targetType" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleJa" TEXT,
    "message" TEXT NOT NULL,
    "messageJa" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sectionId" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT,
    "email" TEXT,
    "profileImage" TEXT,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "positionCode" TEXT,
    "qualificationGrade" TEXT,
    "qualificationGradeCode" TEXT,
    "employmentType" TEXT,
    "employmentTypeCode" TEXT,
    "departmentCode" TEXT,
    "joinDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sectionId" TEXT,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "nameKana" TEXT,
    "email" TEXT NOT NULL,
    "profileImage" TEXT,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "positionCode" TEXT,
    "qualificationGrade" TEXT,
    "qualificationGradeCode" TEXT,
    "employmentType" TEXT,
    "employmentTypeCode" TEXT,
    "departmentCode" TEXT,
    "joinDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "sectionId" TEXT,
    "sectionName" TEXT,
    "courseId" TEXT,
    "courseName" TEXT,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "structureSnapshot" TEXT NOT NULL,
    "employeeCountSnapshot" INTEGER NOT NULL,
    "departmentCount" INTEGER NOT NULL,
    "sectionCount" INTEGER NOT NULL,
    "courseCount" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeDescription" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeDescription" TEXT,
    "changeReason" TEXT,
    "batchId" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "status" "EvaluationPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationWeight" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "positionCode" TEXT NOT NULL DEFAULT 'DEFAULT',
    "positionName" TEXT,
    "gradeCode" TEXT NOT NULL,
    "resultsWeight" INTEGER NOT NULL DEFAULT 30,
    "processWeight" INTEGER NOT NULL DEFAULT 40,
    "growthWeight" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criteria1Result" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "organizationLevel" "OrganizationLevel" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "targetProfit" DOUBLE PRECISION,
    "actualProfit" DOUBLE PRECISION,
    "achievementRate" DOUBLE PRECISION,
    "departmentType" "DepartmentType" NOT NULL DEFAULT 'INDIRECT',
    "linkedOrganizationLevel" "OrganizationLevel",
    "linkedOrganizationId" TEXT,
    "linkedOrganizationName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Criteria1Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomEvaluator" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "periodId" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomEvaluator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationExclusion" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodId" TEXT,
    "reason" "ExclusionReason" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "categoryCode" TEXT NOT NULL DEFAULT 'A',
    "description" TEXT,
    "minItemCount" INTEGER NOT NULL DEFAULT 0,
    "scores" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scoreT1" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "scoreT2" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "scoreT3" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "scoreT4" DOUBLE PRECISION NOT NULL DEFAULT 115,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionGroup" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "positionCodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "departmentName" TEXT,
    "sectionName" TEXT,
    "courseName" TEXT,
    "positionName" TEXT,
    "gradeCode" TEXT,
    "score1" DOUBLE PRECISION,
    "score1Comment" TEXT,
    "processScores" JSONB,
    "score2" DOUBLE PRECISION,
    "score2Comment" TEXT,
    "growthCategoryId" TEXT,
    "growthLevel" INTEGER,
    "score3" DOUBLE PRECISION,
    "score3Comment" TEXT,
    "weightedScore1" DOUBLE PRECISION,
    "weightedScore2" DOUBLE PRECISION,
    "weightedScore3" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "finalGrade" TEXT,
    "overallComment" TEXT,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationGoal" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "goals" JSONB NOT NULL DEFAULT '[]',
    "selfReflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalGoal" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "processGoals" JSONB NOT NULL DEFAULT '[]',
    "growthGoal" JSONB,
    "selfReflection" TEXT,
    "interviewDates" JSONB NOT NULL DEFAULT '[]',
    "selfProcessScores" JSONB,
    "selfProcessComments" JSONB,
    "selfGrowthCategoryId" TEXT,
    "selfGrowthLevel" INTEGER,
    "selfGrowthComment" TEXT,
    "selfEvaluationStatus" TEXT DEFAULT 'DRAFT',
    "selfEvaluationSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProcess" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "BusinessProcessStatus" NOT NULL DEFAULT 'DRAFT',
    "flowDescription" TEXT,
    "interviewHistory" JSONB,
    "diagramXml" TEXT,
    "jobDescriptionMd" TEXT,
    "purpose" TEXT,
    "responsibleDepartment" TEXT,
    "responsiblePerson" TEXT,
    "authority" TEXT,
    "stakeholders" JSONB,
    "businessFlow" TEXT,
    "actors" JSONB,
    "inputs" JSONB,
    "outputs" JSONB,
    "systemsAndTools" JSONB,
    "kpis" JSONB,
    "risksAndIssues" JSONB,
    "improvements" JSONB,
    "tags" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkProcedure" (
    "id" TEXT NOT NULL,
    "businessProcessId" TEXT NOT NULL,
    "diagramCellId" TEXT NOT NULL,
    "swimlaneId" TEXT,
    "taskName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'manual',
    "actorName" TEXT,
    "procedureMd" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureImage" (
    "id" TEXT NOT NULL,
    "workProcedureId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "nfcId" TEXT,
    "email" TEXT,
    "company" TEXT NOT NULL,
    "paymentDay" INTEGER NOT NULL DEFAULT 25,
    "hasApproval" BOOLEAN NOT NULL DEFAULT false,
    "employeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketProduct" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameJa" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSale" (
    "id" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "paymentMethod" "TicketPaymentMethod" NOT NULL,
    "adminNfcId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSalesApiKey" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "adminNfcId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSalesApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSalesApiLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "origin" TEXT,
    "apiKeyId" TEXT,
    "errorMessage" TEXT,
    "responseTimeMs" INTEGER,

    CONSTRAINT "TicketSalesApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagDocument" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "titleJa" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "embedding" JSONB,
    "embeddingModel" TEXT,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagChat" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'general',
    "contextId" TEXT,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "ragEnabled" BOOLEAN NOT NULL DEFAULT true,
    "relevantDocIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "LdapUserMapping_ldapUsername_key" ON "LdapUserMapping"("ldapUsername");

-- CreateIndex
CREATE UNIQUE INDEX "LdapUserMapping_userId_key" ON "LdapUserMapping"("userId");

-- CreateIndex
CREATE INDEX "LdapUserMapping_ldapUsername_idx" ON "LdapUserMapping"("ldapUsername");

-- CreateIndex
CREATE INDEX "LdapUserMapping_userId_idx" ON "LdapUserMapping"("userId");

-- CreateIndex
CREATE INDEX "LdapUserMapping_migrated_idx" ON "LdapUserMapping"("migrated");

-- CreateIndex
CREATE INDEX "LdapAuthLog_ldapUsername_idx" ON "LdapAuthLog"("ldapUsername");

-- CreateIndex
CREATE INDEX "LdapAuthLog_createdAt_idx" ON "LdapAuthLog"("createdAt");

-- CreateIndex
CREATE INDEX "LdapAuthLog_success_idx" ON "LdapAuthLog"("success");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");

-- CreateIndex
CREATE INDEX "AccessKeyPermission_accessKeyId_moduleId_idx" ON "AccessKeyPermission"("accessKeyId", "moduleId");

-- CreateIndex
CREATE INDEX "AccessKeyPermission_accessKeyId_menuPath_idx" ON "AccessKeyPermission"("accessKeyId", "menuPath");

-- CreateIndex
CREATE INDEX "AccessKeyPermission_accessKeyId_tabId_idx" ON "AccessKeyPermission"("accessKeyId", "tabId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessKeyPermission_accessKeyId_permissionId_key" ON "AccessKeyPermission"("accessKeyId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessKey_userId_accessKeyId_key" ON "UserAccessKey"("userId", "accessKeyId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_isActive_startAt_endAt_idx" ON "Announcement"("isActive", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Organization_status_publishAt_idx" ON "Organization"("status", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_departmentId_name_key" ON "Section"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Course_sectionId_name_key" ON "Course"("sectionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "EmployeeHistory_employeeId_validFrom_idx" ON "EmployeeHistory"("employeeId", "validFrom");

-- CreateIndex
CREATE INDEX "EmployeeHistory_validFrom_validTo_idx" ON "EmployeeHistory"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "EmployeeHistory_changeType_idx" ON "EmployeeHistory"("changeType");

-- CreateIndex
CREATE INDEX "OrganizationHistory_organizationId_validFrom_idx" ON "OrganizationHistory"("organizationId", "validFrom");

-- CreateIndex
CREATE INDEX "OrganizationHistory_validFrom_validTo_idx" ON "OrganizationHistory"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "OrganizationHistory_changeType_idx" ON "OrganizationHistory"("changeType");

-- CreateIndex
CREATE INDEX "ChangeLog_entityType_entityId_idx" ON "ChangeLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeLog_changeType_idx" ON "ChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "ChangeLog_changedBy_idx" ON "ChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "ChangeLog_changedAt_idx" ON "ChangeLog"("changedAt");

-- CreateIndex
CREATE INDEX "ChangeLog_batchId_idx" ON "ChangeLog"("batchId");

-- CreateIndex
CREATE INDEX "EvaluationPeriod_year_term_idx" ON "EvaluationPeriod"("year", "term");

-- CreateIndex
CREATE INDEX "EvaluationPeriod_status_idx" ON "EvaluationPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationWeight_periodId_positionCode_gradeCode_key" ON "EvaluationWeight"("periodId", "positionCode", "gradeCode");

-- CreateIndex
CREATE INDEX "Criteria1Result_periodId_idx" ON "Criteria1Result"("periodId");

-- CreateIndex
CREATE INDEX "Criteria1Result_organizationLevel_idx" ON "Criteria1Result"("organizationLevel");

-- CreateIndex
CREATE INDEX "Criteria1Result_linkedOrganizationId_idx" ON "Criteria1Result"("linkedOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Criteria1Result_periodId_organizationLevel_organizationId_key" ON "Criteria1Result"("periodId", "organizationLevel", "organizationId");

-- CreateIndex
CREATE INDEX "CustomEvaluator_evaluatorId_idx" ON "CustomEvaluator"("evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomEvaluator_employeeId_periodId_key" ON "CustomEvaluator"("employeeId", "periodId");

-- CreateIndex
CREATE INDEX "EvaluationExclusion_reason_idx" ON "EvaluationExclusion"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationExclusion_employeeId_periodId_key" ON "EvaluationExclusion"("employeeId", "periodId");

-- CreateIndex
CREATE INDEX "ProcessCategory_isActive_sortOrder_idx" ON "ProcessCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessCategory_categoryCode_key" ON "ProcessCategory"("categoryCode");

-- CreateIndex
CREATE INDEX "GrowthCategory_isActive_sortOrder_idx" ON "GrowthCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PositionGroup_periodId_displayOrder_idx" ON "PositionGroup"("periodId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PositionGroup_periodId_name_key" ON "PositionGroup"("periodId", "name");

-- CreateIndex
CREATE INDEX "Evaluation_periodId_idx" ON "Evaluation"("periodId");

-- CreateIndex
CREATE INDEX "Evaluation_employeeId_idx" ON "Evaluation"("employeeId");

-- CreateIndex
CREATE INDEX "Evaluation_evaluatorId_idx" ON "Evaluation"("evaluatorId");

-- CreateIndex
CREATE INDEX "Evaluation_status_idx" ON "Evaluation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_periodId_employeeId_key" ON "Evaluation"("periodId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationGoal_periodId_employeeId_key" ON "EvaluationGoal"("periodId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalGoal_periodId_userId_key" ON "PersonalGoal"("periodId", "userId");

-- CreateIndex
CREATE INDEX "BusinessProcess_status_idx" ON "BusinessProcess"("status");

-- CreateIndex
CREATE INDEX "BusinessProcess_createdBy_idx" ON "BusinessProcess"("createdBy");

-- CreateIndex
CREATE INDEX "BusinessProcess_createdAt_idx" ON "BusinessProcess"("createdAt");

-- CreateIndex
CREATE INDEX "WorkProcedure_businessProcessId_idx" ON "WorkProcedure"("businessProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkProcedure_businessProcessId_diagramCellId_key" ON "WorkProcedure"("businessProcessId", "diagramCellId");

-- CreateIndex
CREATE INDEX "ProcedureImage_workProcedureId_idx" ON "ProcedureImage"("workProcedureId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCustomer_customerId_key" ON "TicketCustomer"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCustomer_nfcId_key" ON "TicketCustomer"("nfcId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCustomer_employeeId_key" ON "TicketCustomer"("employeeId");

-- CreateIndex
CREATE INDEX "TicketCustomer_customerId_idx" ON "TicketCustomer"("customerId");

-- CreateIndex
CREATE INDEX "TicketCustomer_nfcId_idx" ON "TicketCustomer"("nfcId");

-- CreateIndex
CREATE INDEX "TicketCustomer_employeeId_idx" ON "TicketCustomer"("employeeId");

-- CreateIndex
CREATE INDEX "TicketCustomer_isActive_idx" ON "TicketCustomer"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TicketProduct_code_key" ON "TicketProduct"("code");

-- CreateIndex
CREATE INDEX "TicketProduct_code_idx" ON "TicketProduct"("code");

-- CreateIndex
CREATE INDEX "TicketProduct_isActive_idx" ON "TicketProduct"("isActive");

-- CreateIndex
CREATE INDEX "TicketProduct_sortOrder_idx" ON "TicketProduct"("sortOrder");

-- CreateIndex
CREATE INDEX "TicketSale_soldAt_idx" ON "TicketSale"("soldAt");

-- CreateIndex
CREATE INDEX "TicketSale_customerId_idx" ON "TicketSale"("customerId");

-- CreateIndex
CREATE INDEX "TicketSale_productId_idx" ON "TicketSale"("productId");

-- CreateIndex
CREATE INDEX "TicketSale_paymentMethod_idx" ON "TicketSale"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSalesApiKey_apiKey_key" ON "TicketSalesApiKey"("apiKey");

-- CreateIndex
CREATE INDEX "TicketSalesApiLog_timestamp_idx" ON "TicketSalesApiLog"("timestamp");

-- CreateIndex
CREATE INDEX "TicketSalesApiLog_endpoint_idx" ON "TicketSalesApiLog"("endpoint");

-- CreateIndex
CREATE INDEX "TicketSalesApiLog_statusCode_idx" ON "TicketSalesApiLog"("statusCode");

-- CreateIndex
CREATE INDEX "TicketSalesApiLog_apiKeyId_idx" ON "TicketSalesApiLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "RagDocument_scope_isActive_idx" ON "RagDocument"("scope", "isActive");

-- CreateIndex
CREATE INDEX "RagDocument_scope_category_isActive_idx" ON "RagDocument"("scope", "category", "isActive");

-- CreateIndex
CREATE INDEX "RagDocument_isActive_sortOrder_idx" ON "RagDocument"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "RagChat_scope_contextId_idx" ON "RagChat"("scope", "contextId");

-- CreateIndex
CREATE INDEX "RagChat_userId_createdAt_idx" ON "RagChat"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LdapUserMapping" ADD CONSTRAINT "LdapUserMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessKey" ADD CONSTRAINT "AccessKey_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessKeyPermission" ADD CONSTRAINT "AccessKeyPermission_accessKeyId_fkey" FOREIGN KEY ("accessKeyId") REFERENCES "AccessKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessKeyPermission" ADD CONSTRAINT "AccessKeyPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessKey" ADD CONSTRAINT "UserAccessKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessKey" ADD CONSTRAINT "UserAccessKey_accessKeyId_fkey" FOREIGN KEY ("accessKeyId") REFERENCES "AccessKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationHistory" ADD CONSTRAINT "OrganizationHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationWeight" ADD CONSTRAINT "EvaluationWeight_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criteria1Result" ADD CONSTRAINT "Criteria1Result_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomEvaluator" ADD CONSTRAINT "CustomEvaluator_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomEvaluator" ADD CONSTRAINT "CustomEvaluator_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomEvaluator" ADD CONSTRAINT "CustomEvaluator_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationExclusion" ADD CONSTRAINT "EvaluationExclusion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationExclusion" ADD CONSTRAINT "EvaluationExclusion_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionGroup" ADD CONSTRAINT "PositionGroup_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationGoal" ADD CONSTRAINT "EvaluationGoal_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationGoal" ADD CONSTRAINT "EvaluationGoal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalGoal" ADD CONSTRAINT "PersonalGoal_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalGoal" ADD CONSTRAINT "PersonalGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalGoal" ADD CONSTRAINT "PersonalGoal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProcedure" ADD CONSTRAINT "WorkProcedure_businessProcessId_fkey" FOREIGN KEY ("businessProcessId") REFERENCES "BusinessProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureImage" ADD CONSTRAINT "ProcedureImage_workProcedureId_fkey" FOREIGN KEY ("workProcedureId") REFERENCES "WorkProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCustomer" ADD CONSTRAINT "TicketCustomer_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "TicketCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TicketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'personal',
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startTime_endTime_idx" ON "CalendarEvent"("userId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
