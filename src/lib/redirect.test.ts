import { describe, test, expect } from "bun:test";
import redirect from "./redirect";

// // Mock location for tests
// const mockLocation = {
//   href: "https://test.com",
// };
// Object.defineProperty(global, "location", {
//   value: mockLocation,
//   writable: true,
// });

// describe("getRedirectUrl", () => {
//   test("should default to first URL when no bang is provided", () => {
//     const [bang, query] = parseQuery("some query");
//     const url = findUrl(
//       "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//       bang,
//     );
//     const result = createRedirectUrl(query, url!);
//     expect(result).toBe("https://google.com/search?q=some%20query");
//   });

//   test("finds !bang and returns parsed URL", () => {
//     const [bang, query] = parseQuery("!gh some query");
//     const url = findUrl(
//       "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//       bang,
//     );
//     const result = createRedirectUrl(query, url!);
//     expect(result).toBe("https://github.com/search?q=some%20query");
//   });

//   test("handles multiple bangs for the same URL", () => {
//     const [bang, query] = parseQuery("!google test");
//     const url = findUrl(
//       "g,google>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//       bang,
//     );
//     const result = createRedirectUrl(query, url!);

//     expect(result).toBe("https://google.com/search?q=test");
//   });

//   test("should handle obsidian URL", () => {
//     const [bang, query] = parseQuery("!o test");
//     const url = findUrl(
//       "g,google>google.com/search?q={{{s}}},o>obsidian://search?q={{{s}}}",
//       bang,
//     );
//     const result = createRedirectUrl(query, url!);

//     expect(result).toBe("obsidian://search?q=test");
//   });

//   // test("should default to URL list from bangs.min.json file", () => {
//   //   const [bang, query] = parseQuery("!gh some query");
//   //   const url = findUrl(
//   //     "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//   //     bang,
//   //   );
//   //   const result = createRedirectUrl(query, url!);

//   //   const result = getRedirectUrl("!g test", "o>obsidian://search?q={{{s}}}", {
//   //     g: "google.com/search?q={{{s}}}",
//   //   });
//   //   expect(result).toBe("https://google.com/search?q=test");
//   // });

//   // test("should throw when bang not found", () => {
//   //   const [bang, query] = parseQuery("!gh some query");
//   //   const url = findUrl(
//   //     "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//   //     bang,
//   //   );
//   //   const result = createRedirectUrl(query, url!);

//   //   expect(() =>
//   //     getRedirectUrl(
//   //       "!notfound_8327419299 test",
//   //       "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//   //     ),
//   //   ).toThrow();
//   // });

//   test("should return URL origin when query is empty", () => {
//     const [bang, query] = parseQuery("!gh");
//     const url = findUrl(
//       "g>google.com/search?q={{{s}}},gh>github.com/search?q={{{s}}}",
//       bang,
//     );
//     const result = createRedirectUrl(query, url!);

//     expect(result).toBe("https://github.com");
//   });

//   test("should ignore search query when url lacks {{{s}}}", () => {
//     const url = findUrl("gh>github.com", "gh");

//     const result1 = createRedirectUrl("foo", url!);
//     expect(result1).toBe("https://github.com");

//     const result2 = createRedirectUrl("", url!);
//     expect(result2).toBe("https://github.com");
//   });
// });

describe("redirect", () => {
  test("should redirect according to set config", () => {
    Object.defineProperty(global, "document", {
      value: { title: "" },
      writable: true,
    });

    Object.defineProperty(global, "window", {
      value: { onblur() {} },
      writable: true,
    });

    Object.defineProperty(global, "location", {
      value: {
        /*
          !w ... => [duckduckgo.com/?q=weather+{{{s}}}]
          !o => [obsidian://daily, this://close]
          !o search ... => [obsidian://search?query={{{s}}}, this://close]
          !o todo => [obsidian://daily, this://close]
          !o todo x ... => [obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}, this://close]
          !o todo ... => [obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}, this://close]
          !o ... => [obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}, this://close]
          !todo => [obsidian://daily, this://close]
          !todo x ... => [obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}, this://close]
          !todo ... => [obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}, this://close]
          !pp => [perplexity.ai]
          !pp ... => [perplexity.ai/search?q={{{s}}}]
          !s => [steam://open/bigpicture]
          ... => [https://duckduckgo.com/?q={{{s}}}]
        */
        search:
          "?q=%s&b=DgQg7g-MBUECYFcDGBrRqDmB7AdErAtgPQD8AjgLxgCmAhgC4AW1ATgNQDeXAzgL78BcYAJBYo3OiySMosLACNuASzhLaAOwBcRIhNpTG5BKwCeFLhz78AeEyXdtRJABssEoQPpY4Y4AA9ZCAVlVQ1HMgQlVFo4OBI4WiVnM3oWYwAyaSwo6gp8AgAHZ2p6ajgAWi8fdIA3WmdjSqwAUgBGAA4fZoAmAAZSv3pzHn5eW0Z7Rxc3ag85RRU1LR0IqJQYuISklLTqTMZspFyqrFr6xq82zpa-gaGLKzG7Bx1p9xAghdDloi3k8cmr1c7mE8xCS3CkWisXiiWSFFSGSyOQoACssAgWOp6mcGtRyujMdjnFdqOpUmYHqMAS8nMDZh9goswjo_iYaVN6R4QCcoAEYJ9wSyiKtoZs4TskQcUfkiiUyk1qnU8U0rl1btRBsNLNTnpyZnNBcyfqL1jC2QjdvtDsdvKdlRcWh11f1NfcRjY9UCDYyvhDWRKOd6QSICgVAgVWHK_Ep6CYcIldJJpORtY8RBBIyxo7H44ludxAhnuKVaARHFhI-oiPIlBgClF6JjZqCIIx6PQCrT0GhkChsHhCKRKFTBMAgA" //
            .replace("%s", "!o%20testing"),
        replace(url: string) {
          expect(url).toBe(
            "obsidian://quickadd?daily=true&choice=journal&value-journal%18entry=testing",
          );
        },
      },
      writable: true,
    });

    redirect();
  });
});
