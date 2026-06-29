import { expect, test } from "bun:test";
import RedirectMap from "../src/lib/redirectTree";
import { DEFAULT_B } from "../src/lib/defaultConfig";
import { descriptor, default as handler } from "./opensearch";

test("bakes the given b into both result and suggestion URLs", () => {
  const b = RedirectMap.fromDSL(`!x ... => example.com?q={{{s}}}`).serialize();
  const xml = descriptor(b, "https://joomp.link");
  const eb = encodeURIComponent(b);
  expect(xml).toContain(`/x?q={searchTerms}&amp;b=${eb}`);
  expect(xml).toContain(`/api/suggest?q={searchTerms}&amp;b=${eb}`);
});

test("escapes & in URLs so the XML stays valid", () => {
  const xml = descriptor(DEFAULT_B, "https://joomp.link");
  expect(xml).not.toMatch(/&(?!amp;|lt;|gt;)/); // no raw ampersands
});

test("handler falls back to default config on garbled b", async () => {
  const req = new Request("https://joomp.link/api/opensearch?b=not-valid");
  const xml = await handler(req).text();
  expect(xml).toContain(encodeURIComponent(DEFAULT_B));
});

test("handler uses default when b is absent", async () => {
  const req = new Request("https://joomp.link/api/opensearch");
  const xml = await handler(req).text();
  expect(xml).toContain(encodeURIComponent(DEFAULT_B));
});
