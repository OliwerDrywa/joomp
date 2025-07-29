import { expect, test, describe } from "bun:test";
import { compress, decompress, Compression } from "@/lib/compression";

describe("Compression utilities", () => {
  const testString = "Hello, World!";
  const complexString = JSON.stringify({
    bangs: ["g", "google"],
    url: "google.com/search?q={{{s}}}",
  });

  describe("compress", () => {
    test("should compress with None method", () => {
      const result = compress(testString, Compression.None);
      expect(result).toBe(`${Compression.None}${testString}`);
    });

    test("should compress with Base64 method", () => {
      const result = compress(testString, Compression.Base64);
      expect(result).toStartWith(`${Compression.Base64}`);
      expect(result.length).toBeGreaterThan(testString.length);
    });

    test("should compress with LZString method", () => {
      const result = compress(testString, Compression.LZString);
      expect(result).toStartWith(`${Compression.LZString}`);
    });

    test("should compress with Pako method", () => {
      const result = compress(testString, Compression.Gzip);
      expect(result).toStartWith(`${Compression.Gzip}`);
    });

    test("should throw error for unknown compression method", () => {
      expect(() => compress(testString, "X" as Compression)).toThrow(
        "Unknown compression method: X",
      );
    });
  });

  describe("decompress", () => {
    test("should decompress None-compressed string", () => {
      const compressed = compress(testString, Compression.None);
      const [result] = decompress(compressed);
      expect(result).toBe(testString);
    });

    test("should decompress Base64-compressed string", () => {
      const compressed = compress(testString, Compression.Base64);
      const [result] = decompress(compressed);
      expect(result).toBe(testString);
    });

    test("should decompress LZString-compressed string", () => {
      const compressed = compress(testString, Compression.LZString);
      const [result] = decompress(compressed);
      expect(result).toBe(testString);
    });

    test("should decompress Pako-compressed string", () => {
      const compressed = compress(testString, Compression.Gzip);
      const [result] = decompress(compressed);
      expect(result).toBe(testString);
    });

    test("should handle complex strings", () => {
      const compressed = compress(complexString, Compression.Gzip);
      const [result] = decompress(compressed);
      expect(result).toBe(complexString);
    });

    test("should throw error for empty string", () => {
      expect(() => decompress("")).toThrow(
        "Empty string cannot be decompressed",
      );
    });

    test("should throw error for unknown compression method", () => {
      expect(() => decompress("9invalid")).toThrow(
        "Unknown compression method: 9",
      );
    });
  });

  describe("round-trip compression", () => {
    test("should preserve data through compression and decompression cycles", () => {
      const testData = [
        "simple string",
        "string with special chars: !@#$%^&*()",
        '{"json": "data", "with": ["arrays", "and", "objects"]}',
        "a".repeat(1000), // long string
      ];

      for (const data of testData) {
        for (const method of [
          Compression.None,
          Compression.Base64,
          Compression.LZString,
          Compression.Gzip,
        ]) {
          const compressed = compress(data, method);
          const [decompressed] = decompress(compressed);
          expect(decompressed).toBe(data);
        }
      }
    });

    test("should handle unicode with LZString and Pako compression", () => {
      const unicodeData = "unicode: 🚀 ñ ü ç";

      // Unicode works with LZString and Pako but not with btoa (Base64)
      for (const method of [
        Compression.None,
        Compression.LZString,
        Compression.Gzip,
      ]) {
        const compressed = compress(unicodeData, method);
        const [decompressed] = decompress(compressed);
        expect(decompressed).toBe(unicodeData);
      }
    });

    test("should handle empty string with None compression only", () => {
      // Empty string can only be handled with None compression
      const compressed = compress("", Compression.None);
      const [decompressed] = decompress(compressed);
      expect(decompressed).toBe("");
    });
  });
});
