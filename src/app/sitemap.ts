import type { MetadataRoute } from "next";
import { fetchPublishedContents } from "@/lib/content-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://main.d1ece7jdtq0bus.amplifyapp.com";
  const contents = await fetchPublishedContents();
  return [
    { url: baseUrl, lastModified: new Date("2026-08-14") },
    { url: `${baseUrl}/content`, lastModified: new Date("2026-08-14") },
    { url: `${baseUrl}/policy`, lastModified: new Date("2026-08-14") },
    { url: `${baseUrl}/ranking`, lastModified: new Date("2026-08-16") },
    { url: `${baseUrl}/correction`, lastModified: new Date("2026-08-14") },
    ...contents.map((content) => ({ url: `${baseUrl}/content/${content.slug}`, lastModified: new Date(content.updatedAt) })),
  ];
}
