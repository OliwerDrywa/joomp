import { expect, test, describe } from "bun:test";
import { compress } from "./compression";
import { decompress } from "./redirect";

const TEST_STRING = `
  ddg -> duckduckgo.com/?q={{{s}}}
  w -> duckduckgo.com/?q=weather+{{{s}}}
  gh -> github.com/search?q={{{s}}}
  yt -> youtube.com/results?search_query={{{s}}}
  wiki -> wikipedia.org/wiki/Special:Search?search={{{s}}}
`;

describe("Compression utilities", () => {
  describe("compress", () => {
    test("should compress", () => {
      // NOTE: LZString compression is only effective for larger strings.
      // i guesstimate that at about 5+ remapped URLs it's worthwhile,
      // therefore it's worth always compressing, most set ups will have
      // more than that i think.
      // i hope the overhead won't be noticeable, if it will then removing
      // compression entirely should be easy enought too.
      const result = compress(TEST_STRING);
      expect(result.length).toBeLessThan(TEST_STRING.length);
    });
  });

  describe("round-trip compression", () => {
    test("should preserve data through compression and decompression cycles", () => {
      const testData = [
        "simple string",
        "string with special chars: !@#$%^&*()",
        '{"json": "data", "with": ["arrays", "and", "objects"]}',
        "long".repeat(1000),
      ];

      for (const data of testData) {
        const compressed = compress(data);
        const decompressed = decompress(compressed);
        expect(decompressed).toBe(data);
      }
    });

    test("should handle unicode with LZString compression", () => {
      const unicodeData = "unicode: 🚀 ñ ü ç";

      // Unicode works with LZString but not with btoa (Base64)
      const compressed = compress(unicodeData);
      const decompressed = decompress(compressed);
      expect(decompressed).toBe(unicodeData);
    });
  });
});
