import type { MetadataRoute } from "next";
import { fixtureContent } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://k-beauty-atlas-japan.example.com";
  return [
    { url: baseUrl, lastModified: new Date("2026-08-14") },
    { url: `${baseUrl}/content`, lastModified: new Date("2026-08-14") },
    { url: `${baseUrl}/policy`, lastModified: new Date("2026-08-14") },
    { url: `${baseUrl}/correction`, lastModified: new Date("2026-08-14") },
    ...fixtureContent.map((content) => ({ url: `${baseUrl}/content/${content.slug}`, lastModified: new Date(content.updatedAt) })),
  ];
}
