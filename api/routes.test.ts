import { expect, test } from "bun:test";
import vercelConfig from "../vercel.json";

test("exposes autocomplete at /ac", () => {
  expect(vercelConfig.rewrites).toContainEqual({
    source: "/ac",
    destination: "/api/suggest",
  });
});
