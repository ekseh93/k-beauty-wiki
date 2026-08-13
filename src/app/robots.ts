import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }], sitemap: "https://k-beauty-atlas-japan.example.com/sitemap.xml" };
}
