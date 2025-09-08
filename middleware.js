// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that require auth
const isProtectedRoute = createRouteMatcher([
  "/orders(.*)",
  "/private(.*)",
]);

// Your auth pages (and Clerk defaults) – hide these when already signed in
const isAuthRoute = createRouteMatcher([
  "/auth/login(.*)",
  "/auth/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware((auth, req) => {
  const { userId } = auth();
  const url = req.nextUrl;

  // If signed in, don't show auth pages
  if (isAuthRoute(req) && userId) {
    const dest = url.clone();
    dest.pathname = "/";                 // or "/dashboard"
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // If not signed in, protect private routes
  if (isProtectedRoute(req) && !userId) {
    const dest = url.clone();
    dest.pathname = "/auth/login";
    // so we can send them back after login
    dest.searchParams.set("redirect_url", url.pathname + url.search);
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
});

// Run middleware on all pages except static assets, _next, and webhooks
export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next|favicon.ico|api/webhooks).*)",
    "/",
  ],
};
