import type { CollectionEntry } from "astro:content";

export type SectionEntry = CollectionEntry<"sections">;
export type ArticleEntry = CollectionEntry<"articles">;

export function sectionUrlPath(section: SectionEntry): string {
  return section.id.replace(/^unprofessionals\//, "");
}

export function articleSlug(article: ArticleEntry): string {
  return article.id.split("/").pop() ?? article.id;
}

export function articleUrlPath(article: ArticleEntry): string {
  const sectionPath = article.data.section.replace(/^unprofessionals\//, "");
  return `${sectionPath}/${articleSlug(article)}`;
}

export function getChildSections(
  sections: SectionEntry[],
  parentId: string,
): SectionEntry[] {
  const prefix = `${parentId}/`;
  return sections.filter((section) => {
    if (!section.id.startsWith(prefix)) return false;
    return !section.id.slice(prefix.length).includes("/");
  });
}

export function getArticlesForSection(
  articles: ArticleEntry[],
  sectionId: string,
): ArticleEntry[] {
  return articles
    .filter((article) => article.data.section === sectionId)
    .sort((a, b) => {
      const yearDiff = (b.data.year ?? 0) - (a.data.year ?? 0);
      if (yearDiff !== 0) return yearDiff;
      return a.data.title.localeCompare(b.data.title);
    });
}

export function groupArticlesByYear(
  articles: ArticleEntry[],
): Map<number | "other", ArticleEntry[]> {
  const groups = new Map<number | "other", ArticleEntry[]>();

  for (const article of articles) {
    const key = article.data.year ?? "other";
    const group = groups.get(key) ?? [];
    group.push(article);
    groups.set(key, group);
  }

  return new Map(
    [...groups.entries()].sort(([a], [b]) => {
      if (a === "other") return 1;
      if (b === "other") return -1;
      return (b as number) - (a as number);
    }),
  );
}

export function groupArticlesByLocation(
  articles: ArticleEntry[],
  locationOrder: string[] = [],
): Map<string, ArticleEntry[]> {
  const groups = new Map<string, ArticleEntry[]>();

  for (const article of articles) {
    const key = article.data.location ?? "Other";
    const group = groups.get(key) ?? [];
    group.push(article);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.data.title.localeCompare(b.data.title));
  }

  const orderedKeys = [
    ...locationOrder.filter((key) => groups.has(key)),
    ...[...groups.keys()]
      .filter((key) => !locationOrder.includes(key))
      .sort((a, b) => a.localeCompare(b)),
  ];

  return new Map(orderedKeys.map((key) => [key, groups.get(key)!]));
}
