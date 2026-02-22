export { default } from "next-auth/middleware";

export const config = {
  // Protect / and /schedule, but allow /api/auth and other static files
  matcher: [
    "/",
    "/schedule/:path*",
  ],
};
