export const COMPARISON_LIMIT = 3;

export function toggleComparisonSelection(
  selectedSlugs: readonly string[],
  slug: string,
  limit = COMPARISON_LIMIT,
): string[] {
  if (selectedSlugs.includes(slug)) return selectedSlugs.filter((item) => item !== slug);
  if (selectedSlugs.length >= limit) return [...selectedSlugs];
  return [...selectedSlugs, slug];
}
