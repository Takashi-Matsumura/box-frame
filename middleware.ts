import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Build ID mismatch helper
  const hasBuildIdMismatch = (s: typeof session): boolean => {
    if (!s) return false;
    const currentBuildId = process.env.NEXT_BUILD_ID;
    const tokenBuildId = (s as unknown as Record<string, unknown>)
      .buildId as string | undefined;
    return !!(
      currentBuildId &&
      currentBuildId !== "dev" &&
      tokenBuildId &&
      tokenBuildId !== currentBuildId
    );
  };

  // Public routes
  const publicRoutes = ["/", "/login"];
  if (publicRoutes.includes(pathname)) {
    // Redirect authenticated users away from login page
    if (pathname === "/login" && session) {
      // If build ID doesn't match, clear session cookies and stay on /login
      if (hasBuildIdMismatch(session)) {
        const response = NextResponse.next();
        response.cookies.delete("authjs.session-token");
        response.cookies.delete("__Secure-authjs.session-token");
        return response;
      }
      // Check if 2FA is required
      if (session.user.twoFactorEnabled) {
        const verified = req.cookies.get("2fa_verified");
        if (verified?.value !== session.user.id) {
          return NextResponse.redirect(new URL("/auth/verify-totp", req.url));
        }
      }
      // Check if password change is required
      if (session.user.mustChangePassword) {
        return NextResponse.redirect(
          new URL("/settings?passwordReset=true", req.url),
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 2FA verification page - allow access if logged in but not verified
  if (pathname === "/auth/verify-totp") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // If 2FA is not enabled or already verified, redirect to dashboard
    if (!session.user.twoFactorEnabled) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const verified = req.cookies.get("2fa_verified");
    if (verified?.value === session.user.id) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Build ID validation: invalidate sessions from previous deployments
  if (session && hasBuildIdMismatch(session)) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    return response;
  }

  // Protected routes - require authentication
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check 2FA verification for protected routes
  if (session.user.twoFactorEnabled) {
    const verified = req.cookies.get("2fa_verified");
    if (verified?.value !== session.user.id) {
      return NextResponse.redirect(new URL("/auth/verify-totp", req.url));
    }
  }

  // Check if password change is required for protected routes
  // Allow access to /settings for password change
  if (session.user.mustChangePassword && !pathname.startsWith("/settings")) {
    return NextResponse.redirect(
      new URL("/settings?passwordReset=true", req.url),
    );
  }

  // Admin-only routes
  // 注意: アクセスキーによる権限委譲があるため、ミドルウェアでは厳密なロールチェックを行わない
  // 各ページで checkAccess を使用して詳細なアクセス制御を行う
  // ここでは /admin のトップページのみ ADMIN 専用として制限
  if (pathname === "/admin") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Executive routes - accessible by EXECUTIVE and ADMIN only
  if (pathname.startsWith("/executive")) {
    if (session.user.role !== "EXECUTIVE" && session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Manager routes
  // Exception: /manager/organization-chart is accessible by USER, MANAGER, EXECUTIVE, and ADMIN
  if (pathname.startsWith("/manager")) {
    if (pathname === "/manager/organization-chart") {
      // Allow USER, MANAGER, EXECUTIVE, and ADMIN
      if (
        session.user.role !== "USER" &&
        session.user.role !== "MANAGER" &&
        session.user.role !== "EXECUTIVE" &&
        session.user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else {
      // Other /manager routes require MANAGER, EXECUTIVE, or ADMIN
      if (
        session.user.role !== "MANAGER" &&
        session.user.role !== "EXECUTIVE" &&
        session.user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  // Back Office routes - accessible by USER, MANAGER, EXECUTIVE, and ADMIN
  if (pathname.startsWith("/backoffice")) {
    if (
      session.user.role !== "USER" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "EXECUTIVE" &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  // uploads はrewriteで/api/uploads/にマッピングされるため、middlewareから除外
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
