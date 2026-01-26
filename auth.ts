import type { Role } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import type { OpenLdapService } from "@/lib/ldap/openldap-service";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * 初期ロールを決定する
 *
 * Employeeテーブルからメールアドレスで検索し、
 * 部署責任者（本部長・部長・課長）の場合はMANAGERロールを返す
 */
async function determineInitialRole(email: string): Promise<Role> {
  try {
    // Employeeをメールで検索
    const employee = await prisma.employee.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!employee) {
      return "USER";
    }

    // このEmployeeが部署責任者かどうかを確認
    // Department, Section, Courseのいずれかでmanagerとして設定されているか
    const [managedDepartment, managedSection, managedCourse] = await Promise.all([
      prisma.department.findFirst({
        where: { managerId: employee.id },
        select: { id: true },
      }),
      prisma.section.findFirst({
        where: { managerId: employee.id },
        select: { id: true },
      }),
      prisma.course.findFirst({
        where: { managerId: employee.id },
        select: { id: true },
      }),
    ]);

    const isManager = !!(managedDepartment || managedSection || managedCourse);

    if (isManager) {
      console.log(`[Auth] Employee ${email} is a manager, assigning MANAGER role`);
      return "MANAGER";
    }

    return "USER";
  } catch (error) {
    console.error("[Auth] Error determining initial role:", error);
    return "USER";
  }
}

/**
 * Lazy Migration: レガシーLDAPからOpenLDAPへの移行を試行
 *
 * OpenLDAP認証に失敗した場合に呼び出され、以下のフローを実行:
 * 1. LDAP Migrationモジュールが有効かチェック
 * 2. レガシーLDAPで認証を試行
 * 3. 成功した場合:
 *    a. 会社組織(Employee)からメールで検索して社員情報を取得
 *    b. OpenLDAPに新規ユーザーを作成
 *    c. User/LdapUserMappingを作成（migrated=true）
 *    d. ログイン成功を返す
 */
async function tryLegacyLdapMigration(
  username: string,
  password: string,
  openLdapService: OpenLdapService,
): Promise<{
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
} | null> {
  try {
    // 1. LDAP Migrationモジュールが有効かチェック
    const { isLdapMigrationEnabled, LegacyLdapService } = await import(
      "@/lib/addon-modules/ldap-migration/legacy-ldap-service"
    );

    const migrationEnabled = await isLdapMigrationEnabled();
    if (!migrationEnabled) {
      console.log("[Auth] LDAP Migration module is not enabled");
      return null;
    }

    // 2. レガシーLDAPサービスを取得
    const legacyService = await LegacyLdapService.createWithDatabaseConfig();
    if (!legacyService) {
      console.log("[Auth] Legacy LDAP is not configured");
      return null;
    }

    // 3. レガシーLDAPで認証を試行
    console.log(`[Auth] Trying legacy LDAP authentication for: ${username}`);
    const legacyAuthResult = await legacyService.authenticate(
      username,
      password,
    );

    if (!legacyAuthResult.success) {
      console.log(
        "[Auth] Legacy LDAP authentication failed:",
        legacyAuthResult.error,
      );
      return null;
    }

    console.log(`[Auth] Legacy LDAP authentication successful: ${username}`);

    // 4. 会社組織(Employee)からメールで検索して社員情報を取得
    let employeeData: {
      name: string;
      email: string;
      employeeId?: string;
    } | null = null;

    // レガシーLDAPの設定からemailDomainを取得
    const { loadLegacyLdapConfigFromDatabase } = await import(
      "@/lib/addon-modules/ldap-migration/legacy-ldap-service"
    );
    const legacyConfig = await loadLegacyLdapConfigFromDatabase();
    const emailDomain = legacyConfig?.emailDomain;

    // メールアドレスの決定
    // 1. レガシーLDAPのmail属性
    // 2. emailDomainが設定されている場合は username@emailDomain
    // 3. フォールバック: username@openldap.local
    const ldapEmail = legacyAuthResult.email;
    let generatedEmail: string | null = null;

    if (!ldapEmail && emailDomain) {
      // emailDomainが設定されている場合、ユーザ名からメールを生成
      generatedEmail = `${username}@${emailDomain}`;
      console.log(`[Auth] Generated email from emailDomain: ${generatedEmail}`);
    }

    // メールアドレスでEmployee検索
    const searchEmail = ldapEmail || generatedEmail;
    if (searchEmail) {
      const employee = await prisma.employee.findUnique({
        where: { email: searchEmail },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
        },
      });

      if (employee) {
        employeeData = {
          name: employee.name,
          email: employee.email || searchEmail,
          employeeId: employee.employeeId,
        };
        console.log(
          `[Auth] Found employee data for migration: ${employee.name} (${employee.employeeId})`,
        );
      }
    }

    // 5. OpenLDAPに新規ユーザーを作成
    // メールアドレスの優先順位: LDAPのmail属性 > 生成したメール > Employee > フォールバック
    const displayName =
      employeeData?.name || legacyAuthResult.displayName || username;
    const email =
      ldapEmail || generatedEmail || employeeData?.email || `${username}@openldap.local`;

    const createResult = await openLdapService.createUser(username, password, {
      displayName,
      email,
      employeeNumber: employeeData?.employeeId,
    });

    if (!createResult.success) {
      console.error(
        "[Auth] Failed to create user in OpenLDAP:",
        createResult.error,
      );
      // OpenLDAPへの登録に失敗しても、レガシーLDAP認証が成功しているので
      // 一時的にログインを許可（次回以降は再試行）
    } else {
      console.log(`[Auth] Created user in OpenLDAP: ${username}`);
    }

    // 6. User/LdapUserMappingを作成または更新
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 新規ユーザー作成（部署責任者の場合はMANAGERロール）
      const initialRole = await determineInitialRole(email);
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          role: initialRole,
          emailVerified: new Date(),
          lastSignInAt: new Date(),
        },
      });
      console.log(`[Auth] Created new user: ${email}`);
    } else {
      // 既存ユーザーの最終ログイン更新
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSignInAt: new Date() },
      });
    }

    // LdapUserMappingを作成（migrated=true）
    let mapping = await prisma.ldapUserMapping.findUnique({
      where: { ldapUsername: username },
    });

    if (!mapping) {
      mapping = await prisma.ldapUserMapping.create({
        data: {
          ldapUsername: username,
          userId: user.id,
          ldapDN: createResult.userDN || legacyAuthResult.userDN,
          email,
          displayName,
          mappingType: "AUTO",
          migrated: true,
          migratedAt: new Date(),
          migratedFrom: "legacy",
          lastLoginAt: new Date(),
        },
      });
      console.log(
        `[Auth] Created LDAP mapping with migration flag: ${username}`,
      );
    } else {
      // 既存のマッピングがある場合は移行フラグを更新
      await prisma.ldapUserMapping.update({
        where: { id: mapping.id },
        data: {
          migrated: true,
          migratedAt: new Date(),
          migratedFrom: "legacy",
          lastLoginAt: new Date(),
        },
      });
    }

    // 7. 通知と監査ログ
    await NotificationService.securityNotify(user.id, {
      title: "Account migrated and logged in",
      titleJa: "アカウントが移行されログインしました",
      message:
        "Your account has been migrated from the legacy LDAP server to OpenLDAP.",
      messageJa: "アカウントがレガシーLDAPサーバからOpenLDAPに移行されました。",
    }).catch((err) => {
      console.error("[Auth] Failed to create migration notification:", err);
    });

    await AuditService.log({
      action: "LOGIN_SUCCESS",
      category: "AUTH",
      userId: user.id,
      details: {
        username,
        provider: "openldap",
        migratedFrom: "legacy",
        email: user.email,
      },
    }).catch(() => {});

    console.log(`[Auth] Lazy migration completed for: ${username}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error("[Auth] Legacy LDAP migration error:", error);
    return null;
  }
}

// Full auth config with LDAP providers (for API routes - Node.js runtime)
// Extends the base authConfig with additional OpenLDAP provider
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      id: "openldap",
      name: "OpenLDAP",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // OpenLDAPサービスで認証を実行（データベースから設定を読み込む）
          // Dynamic import to avoid webpack bundling issues with ldapts
          const { OpenLdapService } = await import(
            "@/lib/ldap/openldap-service"
          );
          const openLdapService =
            await OpenLdapService.createWithDatabaseConfig();
          const authResult = await openLdapService.authenticate(
            credentials.username as string,
            credentials.password as string,
          );

          if (!authResult.success) {
            console.log(
              "[Auth] OpenLDAP authentication failed:",
              authResult.error,
            );

            // LDAP Migration: レガシーLDAPへのフォールバック試行
            const legacyMigrationResult = await tryLegacyLdapMigration(
              credentials.username as string,
              credentials.password as string,
              openLdapService,
            );

            if (legacyMigrationResult) {
              // レガシーLDAPからの移行が成功
              return legacyMigrationResult;
            }

            // ログイン失敗を監査ログに記録
            await AuditService.log({
              action: "LOGIN_FAILURE",
              category: "AUTH",
              details: {
                username: credentials.username,
                provider: "openldap",
                reason: authResult.error,
              },
            }).catch(() => {});
            return null;
          }

          // OpenLDAPユーザマッピングを確認（既存のLDAPマッピングを流用）
          let mapping = await prisma.ldapUserMapping.findUnique({
            where: { ldapUsername: credentials.username as string },
            include: { user: true },
          });

          // マッピングが存在しない場合、自動作成
          if (!mapping) {
            // メールアドレスでユーザを検索
            const email =
              authResult.email || `${credentials.username}@openldap.local`;
            const existingUser = await prisma.user.findUnique({
              where: { email },
            });

            if (existingUser) {
              // 自動マッピング作成
              mapping = await prisma.ldapUserMapping.create({
                data: {
                  ldapUsername: credentials.username as string,
                  userId: existingUser.id,
                  ldapDN: authResult.userDN,
                  email: authResult.email,
                  displayName: authResult.displayName,
                  mappingType: "AUTO",
                },
                include: { user: true },
              });
            } else {
              // ユーザが存在しない場合、新規作成
              // 部署責任者の場合はMANAGERロール
              const initialRole = await determineInitialRole(email);
              const newUser = await prisma.user.create({
                data: {
                  email,
                  name:
                    authResult.displayName || (credentials.username as string),
                  role: initialRole,
                  emailVerified: new Date(),
                },
              });

              mapping = await prisma.ldapUserMapping.create({
                data: {
                  ldapUsername: credentials.username as string,
                  userId: newUser.id,
                  ldapDN: authResult.userDN,
                  email: authResult.email,
                  displayName: authResult.displayName,
                  mappingType: "AUTO",
                },
                include: { user: true },
              });
            }
          }

          // OpenLDAPから取得したメールアドレスでUser/Mappingを同期
          const ldapEmail = authResult.email;
          if (ldapEmail && ldapEmail !== mapping.user.email) {
            // メールアドレスが変更されている場合、同期
            await prisma.user.update({
              where: { id: mapping.user.id },
              data: { email: ldapEmail },
            });
            await prisma.ldapUserMapping.update({
              where: { id: mapping.id },
              data: { email: ldapEmail },
            });
            // mappingオブジェクトも更新
            mapping.user.email = ldapEmail;
            mapping.email = ldapEmail;
            console.log(
              `[Auth] OpenLDAP email synced: ${mapping.user.email} -> ${ldapEmail}`,
            );
          }

          // 表示名の同期（Employeeテーブルの名前を優先）
          // Employeeが存在する場合はそちらの名前を使用
          const employeeForName = mapping.user.email
            ? await prisma.employee.findUnique({
                where: { email: mapping.user.email },
                select: { name: true },
              })
            : null;

          if (employeeForName) {
            // Employeeが存在する場合、Employeeの名前を優先
            if (employeeForName.name !== mapping.user.name) {
              await prisma.user.update({
                where: { id: mapping.user.id },
                data: { name: employeeForName.name },
              });
              mapping.user.name = employeeForName.name;
              console.log(
                `[Auth] User name synced from Employee: ${employeeForName.name}`,
              );
            }
          } else if (
            authResult.displayName &&
            authResult.displayName !== mapping.user.name
          ) {
            // Employeeが存在しない場合のみ、OpenLDAPのdisplayNameを使用
            await prisma.user.update({
              where: { id: mapping.user.id },
              data: { name: authResult.displayName },
            });
            mapping.user.name = authResult.displayName;
          }

          // 最終ログイン日時を更新
          await prisma.ldapUserMapping.update({
            where: { id: mapping.id },
            data: { lastLoginAt: new Date() },
          });

          // 最終サインイン日時を更新
          await prisma.user.update({
            where: { id: mapping.user.id },
            data: { lastSignInAt: new Date() },
          });

          // ログイン通知を発行
          await NotificationService.securityNotify(mapping.user.id, {
            title: "New login detected",
            titleJa: "新しいログインを検出しました",
            message: "You have successfully logged in via OpenLDAP.",
            messageJa: "OpenLDAPでログインしました。",
          }).catch((err) => {
            console.error("[Auth] Failed to create login notification:", err);
          });

          // ログイン成功を監査ログに記録
          await AuditService.log({
            action: "LOGIN_SUCCESS",
            category: "AUTH",
            userId: mapping.user.id,
            details: {
              username: credentials.username,
              provider: "openldap",
              email: mapping.user.email,
            },
          }).catch(() => {});

          return {
            id: mapping.user.id,
            email: mapping.user.email,
            name: mapping.user.name,
            role: mapping.user.role,
          };
        } catch (error) {
          console.error("[Auth] OpenLDAP authentication error:", error);
          return null;
        }
      },
    }),
  ],
});
