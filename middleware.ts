import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  publicRoutes: ["/sign-in(.*)", "/sign-up(.*)", "/api/ai/breakdown(.*)"],
});

export const config = {
  matcher: [
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
