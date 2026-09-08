import { expect, test } from "bun:test";
import {
  buildEngineEditUrl,
  clampEngineNameInput,
  engineSlug,
  normalizeEngineName,
} from "./engineIdentity";

test("derives a stable DNS-safe slug from the serialized config", async () => {
  const first = await engineSlug("serialized-config-a");
  expect(first).toMatch(/^j-[a-z0-9]{16}$/);
  expect(await engineSlug("serialized-config-a")).toBe(first);
  expect(await engineSlug("serialized-config-b")).not.toBe(first);
});

test("builds a wildcard edit URL whose host identity follows b", async () => {
  const url = await buildEngineEditUrl(
    "https://joomp.link/edit?b=old",
    "serialized-config-a",
    "Work & Docs",
  );

  expect(url.hostname).toBe(
    `${await engineSlug("serialized-config-a")}.joomp.link`,
  );
  expect(url.pathname).toBe("/edit");
  expect(url.searchParams.get("b")).toBe("serialized-config-a");
  expect(url.searchParams.get("n")).toBe("Work & Docs");
});

test("keeps local development on the current host", async () => {
  const url = await buildEngineEditUrl(
    "http://localhost:3000/edit",
    "config",
    "Local",
  );
  expect(url.origin).toBe("http://localhost:3000");
});

test("clamps engine-name input and its DOM value to 16 code points", () => {
  const input = { value: "😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀extra" };

  expect(clampEngineNameInput(input)).toBe("😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀");
  expect(input.value).toBe("😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀");
});

test("normalizes OpenSearch names to 16 Unicode code points", () => {
  expect(normalizeEngineName("  Work & Docs  ")).toBe("Work & Docs");
  expect(normalizeEngineName("😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀")).toBe(
    "😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀",
  );
  expect(normalizeEngineName("   ")).toBe("joomp");
  expect(normalizeEngineName("bad\u0000\u0001\u000Bname")).toBe("badname");
});
