import { expect, test } from "bun:test";
import RedirectMap from "../src/lib/redirectTree";
import { DEFAULT_B } from "../src/lib/defaultConfig";
import { descriptor, default as handler } from "./opensearch";

test("uses the engine name and host while preserving its config", () => {
  const b = RedirectMap.fromDSL(`!x ... => example.com?q={{{s}}}`).serialize();
  const xml = descriptor(b, "Work & Docs", "https://j-abc.joomp.link");
  const encoded = encodeURIComponent(b);

  expect(xml).toContain("<ShortName>Work &amp; Docs</ShortName>");
  expect(xml).toContain(
    `https://j-abc.joomp.link/x?q={searchTerms}&amp;b=${encoded}`,
  );
  expect(xml).toContain(
    `https://j-abc.joomp.link/ac?q={searchTerms}&amp;b=${encoded}`,
  );
  expect(xml).not.toContain("/api/suggest");
});

test("bounds the escaped ShortName to 16 Unicode code points", () => {
  const xml = descriptor(
    DEFAULT_B,
    "😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀<&",
    "https://joomp.link",
  );
  expect(xml).toContain(
    "<ShortName>😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀</ShortName>",
  );
});

test("escapes ampersands so the XML stays valid", () => {
  const xml = descriptor(DEFAULT_B, "Work & Docs", "https://joomp.link");
  expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
});

test("node serverless handler falls back to the default config", () => {
  const res = nodeResponse();
  handler(nodeRequest("/api/opensearch?b=not-valid&n=Work"), res);
  expect(res.body).toContain(encodeURIComponent(DEFAULT_B));
  expect(res.body).toContain("<ShortName>Work</ShortName>");
  expect(res.headers.get("content-type")).toContain(
    "application/opensearchdescription+xml",
  );
  expect(res.headers.get("cache-control")).toContain("private");
});

test("node serverless handler uses the forwarded request origin", () => {
  const res = nodeResponse();
  handler(nodeRequest("/api/opensearch?n=Personal"), res);
  expect(res.body).toContain("https://j-example.joomp.link/ac");
  expect(res.body).toContain("<ShortName>Personal</ShortName>");
});

function nodeRequest(url: string) {
  return {
    headers: { host: "j-example.joomp.link", "x-forwarded-proto": "https" },
    url,
  };
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
