import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/site-metadata";

const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about-us", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact-us", changeFrequency: "monthly", priority: 0.6 },
  { path: "/accessibility", changeFrequency: "yearly", priority: 0.4 },
  { path: "/ai-safety", changeFrequency: "monthly", priority: 0.5 },
  { path: "/content-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.4 },
  {
    path: "/parent-student-privacy",
    changeFrequency: "yearly",
    priority: 0.5,
  },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/refund-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const metadataBase = getMetadataBase();
  if (!metadataBase) return [];

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, metadataBase).toString(),
    changeFrequency,
    priority,
  }));
}
