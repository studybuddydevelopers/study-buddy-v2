import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/site-metadata";

const NON_PUBLIC_PATHS = [
  "/api/",
  "/auth/",
  "/already-logged-in",
  "/chat",
  "/check-email",
  "/cube-usage-audit",
  "/dashboard",
  "/demo-showcase",
  "/exams",
  "/forgot-password",
  "/icon-audit",
  "/login",
  "/materials",
  "/new-logo-preview",
  "/profile",
  "/progress",
  "/reset-password",
  "/settings",
  "/sign-up",
  "/temp-logo-preview",
  "/unauthorized",
  "/verify-email",
] as const;

export default function robots(): MetadataRoute.Robots {
  const metadataBase = getMetadataBase();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...NON_PUBLIC_PATHS],
    },
    ...(metadataBase
      ? {
          sitemap: new URL("/sitemap.xml", metadataBase).toString(),
          host: metadataBase.origin,
        }
      : {}),
  };
}
