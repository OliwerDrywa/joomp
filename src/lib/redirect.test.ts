import { describe, test, expect } from "bun:test";
import { createRedirectUrl, findUrl, parseQuery } from "./redirect";

// // Mock location for tests
// const mockLocation = {
//   href: "https://test.com",
// };
// Object.defineProperty(global, "location", {
//   value: mockLocation,
//   writable: true,
// });

describe("getRedirectUrl", () => {
  test("should default to first URL when no bang is provided", () => {
    const [bang, query] = parseQuery("some query");
    const url = findUrl(
      "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
      bang,
    );
    const result = createRedirectUrl(query, url!);
    expect(result).toBe("https://google.com/search?q=some%20query");
  });

  test("finds !bang and returns parsed URL", () => {
    const [bang, query] = parseQuery("!gh some query");
    const url = findUrl(
      "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
      bang,
    );
    const result = createRedirectUrl(query, url!);
    expect(result).toBe("https://github.com/search?q=some%20query");
  });

  test("handles multiple bangs for the same URL", () => {
    const [bang, query] = parseQuery("!google test");
    const url = findUrl(
      "g,google>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
      bang,
    );
    const result = createRedirectUrl(query, url!);

    expect(result).toBe("https://google.com/search?q=test");
  });

  test("should handle obsidian URL", () => {
    const [bang, query] = parseQuery("!o test");
    const url = findUrl(
      "g,google>google.com/search?q={{{s}}},o>obsidian://search?q={{{s}}}",
      bang,
    );
    const result = createRedirectUrl(query, url!);

    expect(result).toBe("obsidian://search?q=test");
  });

  // test("should default to URL list from bangs.min.json file", () => {
  //   const [bang, query] = parseQuery("!gh some query");
  //   const url = findUrl(
  //     "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
  //     bang,
  //   );
  //   const result = createRedirectUrl(query, url!);

  //   const result = getRedirectUrl("!g test", "o>obsidian://search?q={{{s}}}", {
  //     g: "google.com/search?q={{{s}}}",
  //   });
  //   expect(result).toBe("https://google.com/search?q=test");
  // });

  // test("should throw when bang not found", () => {
  //   const [bang, query] = parseQuery("!gh some query");
  //   const url = findUrl(
  //     "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
  //     bang,
  //   );
  //   const result = createRedirectUrl(query, url!);

  //   expect(() =>
  //     getRedirectUrl(
  //       "!notfound_8327419299 test",
  //       "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
  //     ),
  //   ).toThrow();
  // });

  test("should return URL origin when query is empty", () => {
    const [bang, query] = parseQuery("!gh");
    const url = findUrl(
      "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
      bang,
    );
    const result = createRedirectUrl(query, url!);

    expect(result).toBe("https://github.com");
  });

  test("should ignore search query when url lacks {{{s}}}", () => {
    const url = findUrl("gh>github.com", "gh");

    const result1 = createRedirectUrl("foo", url!);
    expect(result1).toBe("https://github.com");

    const result2 = createRedirectUrl("", url!);
    expect(result2).toBe("https://github.com");
  });
});
