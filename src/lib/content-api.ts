import { fixtureContent, type AtlasContent } from "./content";

const apiUrl = process.env.NEXT_PUBLIC_CONTENT_API_URL ?? "";

interface ContentResponse {
  items?: (AtlasContent & { details?: Record<string, unknown> })[];
}

function normalizeContent(item: AtlasContent & { details?: Record<string, unknown> }): AtlasContent {
  if (!item.details) return item;
  const details = Object.fromEntries(Object.entries(item.details).filter(([key]) => key !== "kind"));
  return { ...item, ...details } as AtlasContent;
}

export async function fetchPublishedContents(): Promise<AtlasContent[]> {
  if (!apiUrl) return process.env.NODE_ENV === "development" ? fixtureContent : [];

  try {
    const response = await fetch(`${apiUrl}/content`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Content API responded with ${response.status}`);
    const body = await response.json() as ContentResponse;
    const items = body.items ?? [];
    if (items.length > 0) return items.map(normalizeContent);
  } catch {
    if (process.env.NODE_ENV !== "development") return [];
  }

  return process.env.NODE_ENV === "development" ? fixtureContent : [];
}

export async function fetchPublishedContentBySlug(slug: string): Promise<AtlasContent | undefined> {
  const contents = await fetchPublishedContents();
  return contents.find((content) => content.slug === slug);
}
