import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// Lightweight auth config for middleware (Edge Runtime compatible)
// Does not include LDAP/OpenLDAP providers to avoid Node.js module dependencies
export const authConfig = {
  // Type assertion needed due to version mismatch between @auth/prisma-adapter and next-auth
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      ...(process.env.NODE_ENV === "development" && {
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth プロバイダー（Google）でのサインイン時
      if (account?.provider === "google" && user.email) {
        // 既存のユーザを検索
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // 既存のアカウントリンクをチェック
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          // アカウントリンクが存在しない場合、作成
          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as
                  | string
                  | null
                  | undefined,
              },
            });
          }

          // 最終サインイン日時を更新
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastSignInAt: new Date() },
          });
        }
      }

      // LDAPプロバイダーの場合も最終サインイン日時を更新
      if (
        (account?.provider === "ldap" || account?.provider === "openldap") &&
        user.id
      ) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSignInAt: new Date() },
        });
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      // 初回ログイン時またはセッション更新時にDBからユーザ情報を取得
      if (user || trigger === "update" || !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email ?? "" },
          select: {
            id: true,
            role: true,
            language: true,
            twoFactorEnabled: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.language = dbUser.language;
          token.twoFactorEnabled = dbUser.twoFactorEnabled;

          // LDAPユーザの場合、パスワード変更必須フラグをチェック
          const ldapMapping = await prisma.ldapUserMapping.findUnique({
            where: { userId: dbUser.id },
            select: { mustChangePassword: true },
          });
          token.mustChangePassword = ldapMapping?.mustChangePassword ?? false;
        } else if (user) {
          // フォールバック: DBにない場合はuserオブジェクトから取得
          token.id = user.id;
          token.role = (user as { role: Role }).role;
          token.mustChangePassword = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.language = (token.language as string) || "en";
        session.user.twoFactorEnabled =
          (token.twoFactorEnabled as boolean) || false;
        session.user.mustChangePassword =
          (token.mustChangePassword as boolean) || false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
