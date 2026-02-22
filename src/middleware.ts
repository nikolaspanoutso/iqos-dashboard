export { default } from "next-auth/middleware";

export const config = {
  // Protect specific sub-routes. We don't protect "/" because it contains the LOGIN UI
  // which would cause an infinite redirect loop.
  matcher: [
    "/schedule/:path*",
    "/api/stores/:path*",
    "/api/sales/:path*",
  ],
};
