import { expect, test } from "bun:test";

const apiModules = ["opensearch.ts", "suggest.ts"];

test("serverless modules use explicit extensions for local runtime imports", async () => {
  for (const module of apiModules) {
    const source = await Bun.file(new URL(`./${module}`, import.meta.url)).text();
    const localImports = [...source.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)].map(
      ([, specifier]) => specifier,
    );

    expect(localImports.length).toBeGreaterThan(0);
    for (const specifier of localImports) {
      expect(specifier).toMatch(/\.(?:js|json)$/);
    }
  }
});
