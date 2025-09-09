// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/private(.*)",          // unchanged
  "/orders/(.*)",
]);

// Define authentication routes
const isAuthRoute = createRouteMatcher([
  "/auth/login(.*)",       // allow subpaths
  "/auth/signup(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // --- NEW: let server actions / RSC / non-GET pass through untouched ---
  if (req.method !== "GET") return NextResponse.next();
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/x-component") || req.headers.has("next-action")) {
    return NextResponse.next();
  }
  // (Optional, only if you match /api in your matcher)
  if (req.nextUrl.pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }
  // ----------------------------------------------------------------------

  const { userId } = await auth(); // no await inside middleware

  // If signed in, don't show auth pages
  if (userId && isAuthRoute(req)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Gate protected routes
  if (isProtectedRoute(req) && !userId) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Keep your matcher as-is
export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)", // ok to keep if you need it
  ],
};
