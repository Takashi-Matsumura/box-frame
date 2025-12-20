-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GUEST', 'USER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LdapMappingType" AS ENUM ('AUTO', 'MANUAL');

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
    "permissionId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "AccessKeyPermission_accessKeyId_permissionId_key" ON "AccessKeyPermission"("accessKeyId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessKey_userId_accessKeyId_key" ON "UserAccessKey"("userId", "accessKeyId");

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
