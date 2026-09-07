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

test("serverless dependency modules use explicit extensions for local runtime imports", async () => {
  const source = await Bun.file(new URL("../src/lib/defaultConfig.ts", import.meta.url)).text();
  const localImports = [...source.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)].map(
    ([, specifier]) => specifier,
  );

  expect(localImports).toEqual(["./redirectTree.js"]);
});

test("serverless JSON imports specify the Node ESM JSON import attribute", async () => {
  for (const module of ["suggest.ts", "../src/lib/redirectTree.ts"]) {
    const source = await Bun.file(new URL(`./${module}`, import.meta.url)).text();
    expect(source).toMatch(/from\s+["'][^"']+\.json["']\s+with\s+\{\s*type:\s*["']json["']\s*\}/);
  }
});

test("serverless code imports the CommonJS lz-string package through its default export", async () => {
  const source = await Bun.file(
    new URL("../src/lib/redirectTree.ts", import.meta.url),
  ).text();

  expect(source).toMatch(/import\s+LZString\s+from\s+["']lz-string["']/);
  expect(source).not.toMatch(/import\s+\{[^}]+\}\s+from\s+["']lz-string["']/);
});
