import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes
  const publicRoutes = ["/", "/login"];
  if (publicRoutes.includes(pathname)) {
    // Redirect authenticated users away from login page
    if (pathname === "/login" && session) {
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
  const adminRoutes = ["/admin", "/admin/users", "/admin/api-keys"];
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Manager routes
  // Exception: /manager/organization-chart is accessible by USER, MANAGER, and ADMIN
  if (pathname.startsWith("/manager")) {
    if (pathname === "/manager/organization-chart") {
      // Allow USER, MANAGER, and ADMIN
      if (
        session.user.role !== "USER" &&
        session.user.role !== "MANAGER" &&
        session.user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else {
      // Other /manager routes require MANAGER or ADMIN
      if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  // Back Office routes - accessible by USER, MANAGER, and ADMIN
  if (pathname.startsWith("/backoffice")) {
    if (
      session.user.role !== "USER" &&
      session.user.role !== "MANAGER" &&
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
