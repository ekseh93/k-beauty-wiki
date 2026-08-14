import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }], sitemap: "https://main.d1ece7jdtq0bus.amplifyapp.com/sitemap.xml" };
}
