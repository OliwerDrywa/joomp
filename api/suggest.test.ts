import { expect, test } from "bun:test";
import RedirectMap from "../src/lib/redirectTree";
import { suggest } from "./suggest";

// A config exercising plain, multi-word, wildcard, and multi-capture patterns.
const b = RedirectMap.fromDSL(`
  !pp => perplexity.ai
  !pp ... => perplexity.ai/search?q={{{s}}}
  !o search ... => obsidian://search?query={{{s}}}
  !flight ... to ... => fly.com?from={{{0}}}&to={{{1}}}
  ... => duckduckgo.com/?q={{{s}}}
`).serialize();

test("suggests a configured command from its leading word", () => {
  expect(suggest("!o", b)).toContain("!o search … ");
});

test("multi-word pattern matches once enough words are typed", () => {
  expect(suggest("!o se", b)).toContain("!o search … ");
  expect(suggest("!o xx", b)).not.toContain("!o search … "); // wrong subword
});

test("multi-capture pattern with delimiters is surfaced", () => {
  expect(suggest("!flight", b)).toContain("!flight … to … ");
});

test("typing into a capture slot keeps the pattern suggested", () => {
  // after "...", anything goes -> still a valid completion target
  expect(suggest("!flight paris", b)).toContain("!flight … to … ");
});

test("bare global wildcard '...' is never suggested", () => {
  expect(suggest("any", b).some((s) => s.startsWith("…"))).toBe(false);
});

test("bang completion still works alongside config", () => {
  const out = suggest("!gith", b);
  expect(out).toContain("!github ");
});

test("no config -> bang completion only, no throw", () => {
  expect(suggest("!gith")).toContain("!github ");
  expect(suggest("plain query")).toEqual([]);
});

test("garbled b does not throw, falls back to bangs", () => {
  expect(() => suggest("!gith", "not-valid-lzstring")).not.toThrow();
  expect(suggest("!gith", "not-valid-lzstring")).toContain("!github ");
});
