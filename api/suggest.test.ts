import { expect, test } from "bun:test";
import RedirectMap from "../src/lib/redirectTree";
import { suggest } from "./suggest";

const b = RedirectMap.fromDSL(`
  !pp => perplexity.ai
  !pp ... => perplexity.ai/search?q={{{s}}}
  !o search ... => obsidian://search?query={{{s}}}
  !flight from ... to ... => fly.com?from={{{0}}}&to={{{1}}}
  ... => duckduckgo.com/?q={{{s}}}
`).serialize();

test("suggests configured literal command prefixes", () => {
  expect(suggest("!o", b)).toContain("!o search ");
  expect(suggest("!o se", b)).toContain("!o search ");
  expect(suggest("!o xx", b)).not.toContain("!o search ");
});

test("completes each multi-capture delimiter while preserving typed captures", () => {
  expect(suggest("!flight", b)).toContain("!flight from ");
  expect(suggest("!flight from foo", b)).toContain("!flight from foo to ");
  expect(suggest("!flight from foo t", b)).toContain("!flight from foo to ");
  expect(suggest("!flight from new york to los angeles", b)).toContain(
    "!flight from new york to los angeles ",
  );
});

test("never suggests the bare global wildcard", () => {
  expect(suggest("any", b).some((s) => s.startsWith("…"))).toBe(false);
});

test("bang completion works alongside configuration", () => {
  expect(suggest("!gith", b)).toContain("!github ");
});

test("bad configuration falls back to bang completion", () => {
  expect(suggest("!gith", "not-valid-lzstring")).toContain("!github ");
  expect(suggest("plain query")).toEqual([]);
});

test("deduplicates suggestions and enforces the requested limit", () => {
  const duplicateB = RedirectMap.fromDSL(`
    !same ... => one.example?q={{{s}}}
    !same ... => two.example?q={{{s}}}
  `).serialize();
  expect(suggest("!s", duplicateB, 1)).toEqual(["!same "]);
});

test("caps oversized input without attempting to deserialize its config", () => {
  expect(suggest("!gith", "x".repeat(10_000))).toContain("!github ");
});

function nodeRequest(url: string) {
  return { headers: { host: "joomp.test", "x-forwarded-proto": "https" }, url };
}

function nodeResponse() {
  let body = "";
  const headers = new Map<string, string>();
  return {
    end(chunk: string) {
      body = chunk;
    },
    get body() {
      return body;
    },
    headers,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
  };
}

test("node serverless handler returns OpenSearch JSON and defensive headers", async () => {
  const handler = (await import("./suggest")).default;
  const res = nodeResponse();
  handler(nodeRequest(`/api/suggest?q=!flight%20from%20foo&b=${encodeURIComponent(b)}`), res);
  expect(JSON.parse(res.body)).toEqual([
    "!flight from foo",
    expect.arrayContaining(["!flight from foo to "]),
  ]);
  expect(res.headers.get("content-type")).toContain("application/x-suggestions+json");
  expect(res.headers.get("cache-control")).toContain("private");
});
