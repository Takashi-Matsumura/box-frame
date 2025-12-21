import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

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
              const newUser = await prisma.user.create({
                data: {
                  email,
                  name:
                    authResult.displayName || (credentials.username as string),
                  role: "USER",
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

          // 表示名も同期
          if (
            authResult.displayName &&
            authResult.displayName !== mapping.user.name
          ) {
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
