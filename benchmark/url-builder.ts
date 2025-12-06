import top100Bangs from "../pre-processing/top-popular/top100.json" assert { type: "json" };
import { compress, Compression } from "../src/lib/compression";
import { stringify, type RedirectData } from "@/lib/parsing";

function collectKeys(list: typeof top100Bangs): RedirectData[] {
  const byUrl = {} as Record<string, string[]>;

  for (const { t, u } of list.sort((a, b) => b.r - a.r)) {
    byUrl[u] ??= [];
    byUrl[u].push(t);
  }

  return Object.entries(byUrl).map(([url, bangs]) => ({ bangs, url }));
}
/**
 * Creates test URLs for benchmarking redirect performance
 */
export function createTestUrls(base: string = "http://localhost:3000") {
  const top100 = collectKeys(top100Bangs);

  const sets = [
    top100.slice(0, 10).sort(() => Math.random() - 0.5),
    top100.slice(0, 20).sort(() => Math.random() - 0.5),
    top100.slice(0, 50).sort(() => Math.random() - 0.5),
    top100.slice(0, 100).sort(() => Math.random() - 0.5),
  ];

  // Get bangs from the smallest set (top 10) for use in search queries
  const availableBangs = sets[0].flatMap((item) => item.bangs);

  // Create various search queries - some with bangs, some without
  const searchQueries = [
    // Regular search queries without bangs
    "javascript tutorial",
    "how to learn programming",
    "best restaurants near me",
    "weather forecast",
    "nodejs documentation",
    "typescript types",

    // Search queries with bangs from sets[0]
    `!${availableBangs[0]} javascript tutorial`,
    `!${availableBangs[1]} programming guide`,
    `!${availableBangs[2]} typescript documentation`,
    `search query !${availableBangs[0]}`,
    `!${availableBangs[3]}`,
    `!${availableBangs[4]} weather today`,

    // Edge cases
    "single word",
    "!nonexistent bang query",
    "",
    "very long search query with multiple words that might test url encoding limits",
  ];

  return Object.values(Compression).flatMap((c) =>
    sets.flatMap((s) =>
      searchQueries.map((query) => ({
        compression: c,
        query,
        set: s.length,
        url:
          base +
          "/x?q=" +
          encodeURIComponent(query) +
          "&b=" +
          encodeURIComponent(compress(stringify(s), c)),
      })),
    ),
  );
}
