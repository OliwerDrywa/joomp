import { describe, test, expect } from "bun:test";
import { getRedirectUrl } from "./redirect";

// Mock location for tests
const mockLocation = {
  href: "https://test.com",
};
Object.defineProperty(global, "location", {
  value: mockLocation,
  writable: true,
});

describe("getRedirectUrl", () => {
  test("should return first URL when no bang is provided", () => {
    const result = getRedirectUrl(
      "some query",
      "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}", // prefix with "" for no compression
    );
    expect(result).toBe("https://google.com/search?q=some%20query");
  });

  test("should find specific bang and return corresponding URL", () => {
    const result = getRedirectUrl(
      "!gh some query",
      "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
    );
    expect(result).toBe("https://github.com/search?q=some%20query");
  });

  test("should handle multiple bangs for the same URL", () => {
    const result = getRedirectUrl(
      "!google test",
      "g,google>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
    );
    expect(result).toBe("https://google.com/search?q=test");
  });

  test("should throw when bang not found", () => {
    expect(() =>
      getRedirectUrl(
        "!notfound test",
        "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
      ),
    ).toThrow();
  });

  test("should return URL origin when query is empty", () => {
    const result = getRedirectUrl("!gh", "gh>github.com/search?q={{{s}}}");
    expect(result).toBe("https://github.com");
  });

  test("should return URL as-is when no template placeholders", () => {
    const result = getRedirectUrl("!home", "home>example.com");
    expect(result).toBe("https://example.com");
  });

  test("should handle URLs without template placeholders correctly", () => {
    const result = getRedirectUrl(
      "!simple test query",
      "simple>example.com/page",
    );
    expect(result).toBe("https://example.com/page");
  });
});
