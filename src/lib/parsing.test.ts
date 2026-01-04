import { expect, test, describe } from "bun:test";
import { stringify, parse, type RedirectData } from "./parsing";
import { findUrl } from "./redirect";

describe("Parsing utilities", () => {
  describe("stringify", () => {
    test("should stringify redirects", () => {
      expect(
        stringify([
          { bangs: ["g", "google"], url: "google.com/search?q={{{s}}}" },
        ]),
      ).toBe("g>google>google.com/search?q={{{s}}}");

      expect(
        stringify([
          { bangs: ["g"], url: "google.com/search?q={{{s}}}" },
          { bangs: ["ddg", "duck"], url: "duckduckgo.com/?q={{{s}}}" },
        ]),
      ).toBe(
        "g>google.com/search?q={{{s}}},ddg>duck>duckduckgo.com/?q={{{s}}}",
      );
    });

    test("should filter out empty redirects", () => {
      expect(
        stringify([
          { bangs: ["g"], url: "google.com/search?q={{{s}}}" },
          { bangs: [], url: "filtered.com" },
          { bangs: ["ddg"], url: "" },
        ]),
      ).toBe("g>google.com/search?q={{{s}}}");
    });

    test("should handle empty array", () => {
      expect(stringify([])).toBe("");
    });
  });

  describe("parse", () => {
    test("should parse redirects", () => {
      expect(parse("g>google>google.com/search?q={{{s}}}")).toEqual([
        { bangs: ["g", "google"], url: "google.com/search?q={{{s}}}" },
      ]);

      expect(
        parse(
          "g>google.com/search?q={{{s}}},ddg>duck>duckduckgo.com/?q={{{s}}}",
        ),
      ).toEqual([
        { bangs: ["g"], url: "google.com/search?q={{{s}}}" },
        { bangs: ["ddg", "duck"], url: "duckduckgo.com/?q={{{s}}}" },
      ]);
    });

    test("should handle empty string", () => {
      expect(parse("")).toEqual([]);
    });
  });

  describe("round-trip parsing", () => {
    test("should preserve data through stringify and parse cycles", () => {
      const testData: RedirectData[] = [
        { bangs: ["g", "google"], url: "google.com/search?q={{{s}}}" },
        { bangs: ["ddg"], url: "duckduckgo.com/?q={{{s}}}" },
        { bangs: ["gh"], url: "github.com/search?q={{{s}}}" },
      ];
      expect(parse(stringify(testData))).toEqual(testData);
    });
  });

  describe("fast findUrl", () => {
    function findUrlSafe(bangList: string, bang?: string): string | undefined {
      const parsed = parse(bangList);
      if (!bang) return parsed[0]?.url;
      return parsed.find((data) => data.bangs.includes(bang))?.url;
    }

    for (const bang of [
      undefined,
      "g",
      "google",
      "goog",
      "gh",
      "github",
      "yt",
      "youtube",
      "tw",
      "twitter",
      "x",
      "ghr",
      "home",
      "about",
      "obs",
      "a",
      "aa",
      "aaa",
      "aaaa",
      "g1",
      "g2",
      "g12",
      "g123",
      "test",
      "my_bang",
      "my-bang",
      "GitHub",
      "GITHUB",
      "GiThUb",
      "nonexistent",
      "hub",
    ]) {
      for (const bangList of [
        "g>google.com/search?q={{{s}}},gh>github>github.com/search?q={{{s}}},yt>youtube>youtube.com/results?search_query={{{s}}}",
        "g>google>google.com/search?q={{{s}}},gh>github>github.com/search?q={{{s}}},ghr>github.com/{{{s}}},yt>youtube>youtube.com/results?search_query={{{s}}},tw>twitter>x>x.com/search?q={{{s}}}",
        "home>example.com,about>example.com/about",
        "obs>obsidian://search?query={{{s}}},g>https://google.com",
        "g1>google1.com,g2>google2.com,g123>google123.com",
        "my_bang>site1.com,my-bang>site2.com",
        "GitHub>github.com,GITHUB>github2.com,github>github3.com",
        "g>google.com,gh>github.com,",
        "g>google.com,,gh>github.com",
        "gh>github.com/search?q={{{s}}}",
        "g>google>goog>google.com/search?q={{{s}}}",
        "a>aa>aaa>aaaa.com",
        "home>example.com",
        "test>example.com/search?q={{{s}}}&foo=bar",
        "github>hub>github.com",
      ]) {
        test(`findUrl("${bangList}", "${bang}")`, () => {
          const faster = findUrl(bangList, bang);
          const safer = findUrlSafe(bangList, bang);
          expect(faster === safer, `"${faster}" !== "${safer}"`).toBe(true);
        });
      }
    }
  });
});
