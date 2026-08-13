import type { AtlasContent, ContentKind } from "./content";

export function searchContents(
  contents: AtlasContent[],
  query: string,
  kind: ContentKind | "all" = "all",
): AtlasContent[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");

  return contents.filter((content) => {
    const matchesKind = kind === "all" || content.kind === kind;
    if (!matchesKind) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      content.titleJa,
      content.koreanName,
      content.summary,
      ...content.tags,
      ...content.aliases,
    ]
      .join(" ")
      .toLocaleLowerCase("ja-JP");

    return searchable.includes(normalizedQuery);
  });
}
