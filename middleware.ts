import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Redirect root / to /app if user has 'uid' cookie (Returning User)
    if (pathname === "/") {
        const uid = request.cookies.get("uid");
        // Only redirect if LANDING_MODE is NOT forced (it is false now in config, check env if dynamic)
        // But since we want to "Open Shop", we assume we want them in the app.
        if (uid) {
            return NextResponse.redirect(new URL("/app", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
