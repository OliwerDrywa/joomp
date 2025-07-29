import { expect, test, describe } from "bun:test";
import { stringify, parse, type RedirectData } from "@/lib/parsing";

describe("Parsing utilities", () => {
  describe("stringify", () => {
    test("should stringify single redirect", () => {
      const redirects: RedirectData[] = [
        {
          bangs: ["g", "google"],
          url: "google.com/search?q={{{s}}}",
        },
      ];

      const result = stringify(redirects);
      expect(result).toBe("g>google>google.com/search?q={{{s}}}");
    });

    test("should stringify multiple redirects", () => {
      const redirects: RedirectData[] = [
        {
          bangs: ["g"],
          url: "google.com/search?q={{{s}}}",
        },
        {
          bangs: ["ddg", "duck"],
          url: "duckduckgo.com/?q={{{s}}}",
        },
      ];

      const result = stringify(redirects);
      expect(result).toBe(
        "g>google.com/search?q={{{s}}},ddg>duck>duckduckgo.com/?q={{{s}}}",
      );
    });

    test("should filter out empty redirects", () => {
      const redirects: RedirectData[] = [
        {
          bangs: ["g"],
          url: "google.com/search?q={{{s}}}",
        },
        {
          bangs: [], // empty bangs
          url: "should-be-filtered.com",
        },
        {
          bangs: ["ddg"],
          url: "", // empty URL
        },
        {
          bangs: [], // both empty
          url: "",
        },
      ];

      const result = stringify(redirects);
      expect(result).toBe("g>google.com/search?q={{{s}}}");
    });

    test("should handle empty array", () => {
      const result = stringify([]);
      expect(result).toBe("");
    });

    test("should handle single bang", () => {
      const redirects: RedirectData[] = [
        {
          bangs: ["wiki"],
          url: "wikipedia.org/wiki/{{{s}}}",
        },
      ];

      const result = stringify(redirects);
      expect(result).toBe("wiki>wikipedia.org/wiki/{{{s}}}");
    });
  });

  describe("parse", () => {
    test("should parse single redirect", () => {
      const input = "g>google>google.com/search?q={{{s}}}";
      const result = parse(input);

      expect(result).toEqual([
        {
          bangs: ["g", "google"],
          url: "google.com/search?q={{{s}}}",
        },
      ]);
    });

    test("should parse multiple redirects", () => {
      const input =
        "g>google.com/search?q={{{s}}},ddg>duck>duckduckgo.com/?q={{{s}}}";
      const result = parse(input);

      expect(result).toEqual([
        {
          bangs: ["g"],
          url: "google.com/search?q={{{s}}}",
        },
        {
          bangs: ["ddg", "duck"],
          url: "duckduckgo.com/?q={{{s}}}",
        },
      ]);
    });

    test("should handle empty string", () => {
      const result = parse("");
      expect(result).toEqual([]);
    });

    test("should handle single bang", () => {
      const input = "wiki>wikipedia.org/wiki/{{{s}}}";
      const result = parse(input);

      expect(result).toEqual([
        {
          bangs: ["wiki"],
          url: "wikipedia.org/wiki/{{{s}}}",
        },
      ]);
    });

    test("should handle URLs with commas in parsing logic", () => {
      // Note: The current parsing logic treats commas as delimiters
      // so URLs with commas will be split. This test documents the current behavior.
      const input = "test>example.com/search?q={{{s}}}&lang=en,us";
      const result = parse(input);

      expect(result).toEqual([
        {
          bangs: ["test"],
          url: "example.com/search?q={{{s}}}&lang=en", // comma splits the URL
        },
      ]);
    });
  });

  describe("round-trip parsing", () => {
    test("should preserve data through stringify and parse cycles", () => {
      const testData: RedirectData[] = [
        {
          bangs: ["g", "google"],
          url: "google.com/search?q={{{s}}}",
        },
        {
          bangs: ["ddg"],
          url: "duckduckgo.com/?q={{{s}}}",
        },
        {
          bangs: ["gh"],
          url: "github.com/search?q={{{s}}}",
        },
        {
          bangs: ["yt", "youtube"],
          url: "youtube.com/results?search_query={{{s}}}",
        },
      ];

      const stringified = stringify(testData);
      const parsed = parse(stringified);

      expect(parsed).toEqual(testData);
    });

    test("should handle edge cases in round-trip with URL-safe content", () => {
      // Using URLs without commas to avoid parsing issues
      const testData: RedirectData[] = [
        {
          bangs: ["test"],
          url: "example.com/path?param=value&another=test-safe",
        },
        {
          bangs: ["special"],
          url: "site.com/search?q={{{s}}}&chars=!@#$%^&*()",
        },
      ];

      const stringified = stringify(testData);
      const parsed = parse(stringified);

      expect(parsed).toEqual(testData);
    });
  });
});
