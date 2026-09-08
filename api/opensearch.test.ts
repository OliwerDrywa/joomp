import { expect, test } from "bun:test";
import RedirectMap from "../src/lib/redirectTree";
import { DEFAULT_B } from "../src/lib/defaultConfig";
import { descriptor, default as handler } from "./opensearch";

test("bakes the given b into both result and autocomplete URLs", () => {
  const b = RedirectMap.fromDSL(`!x ... => example.com?q={{{s}}}`).serialize();
  const xml = descriptor(b, "https://joomp.link");
  const eb = encodeURIComponent(b);
  expect(xml).toContain(`/x?q={searchTerms}&amp;b=${eb}`);
  expect(xml).toContain(`/ac?q={searchTerms}&amp;b=${eb}`);
  expect(xml).not.toContain("/api/suggest");
});

test("escapes ampersands so the XML stays valid", () => {
  const xml = descriptor(DEFAULT_B, "https://joomp.link");
  expect(xml).not.toMatch(/&(?!amp;|lt;|gt;)/);
});

test("node serverless handler falls back to the default config", () => {
  const res = nodeResponse();
  handler(nodeRequest("/api/opensearch?b=not-valid"), res);
  expect(res.body).toContain(encodeURIComponent(DEFAULT_B));
  expect(res.headers.get("content-type")).toContain("application/opensearchdescription+xml");
  expect(res.headers.get("cache-control")).toContain("private");
});

test("node serverless handler uses the forwarded request origin", () => {
  const res = nodeResponse();
  handler(nodeRequest("/api/opensearch"), res);
  expect(res.body).toContain("https://joomp.test/ac");
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
