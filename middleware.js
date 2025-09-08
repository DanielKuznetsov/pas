import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
    // TODO: add more protected routes
    "/private", // —> just an example
    "/orders/(.*)"
]);

// Define authentication routes
const isAuthRoute = createRouteMatcher([
    "/auth/login",
    "/auth/signup",
]);

// Use clerkMiddleware to handle authentication
export default clerkMiddleware(async (auth, req) => {
    console.log("req", req)

    const { userId } = await auth();

    if (userId && isAuthRoute(req)) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    if (isProtectedRoute(req)) {
        const { userId } = auth();

        if (!userId) {
            const loginUrl = new URL("/auth/login", req.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    if (isAuthRoute(req)) {
        const { userId } = auth();

        if (userId) {
            const homeUrl = new URL("/", req.url);
            return NextResponse.redirect(homeUrl);
        }
    }

    return NextResponse.next();
});

// Ensure the matcher is correctly configured
export const config = {
    matcher: [
        "/((?!.+\\.[\\w]+$|_next).*)", // Exclude static files
        "/",
        "/(api|trpc)(.*)" // Match API routes
    ],
};