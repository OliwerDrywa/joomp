import { describe, expect, test } from "bun:test";
import {
  type CommandDefinitionTree,
  type RedirectData,
  deserializeCommandTree,
  dslToTree,
  EXAMPLE_CONFIG,
  executeCommand,
  MATCH_ALL,
  MATCH_NONE,
  redirectDataToTree,
  serializeCommandTree,
  treeToDsl,
  treeToRedirectData,
} from "./commands";

const EXPECTED_DSL = `
!pp     => [perplexity.ai]
!pp ... => [perplexity.ai/search?q={{{s}}}]
!w ... => [duckduckgo.com/?q=weather+{{{s}}}]
!o            => [obsidian://daily, this://close]
!o search ... => [obsidian://search?query={{{s}}}, this://close]
!o ...        => [obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}, this://close]
!todo       => [obsidian://daily, this://close]
!todo x ... => [obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}, this://close]
!todo ...   => [obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}, this://close]
!steam => [steam://open/bigpicture]
... => https://duckduckgo.com/?q={{{s}}}
`

describe("executeCommand", () => {
  for (const { input, expected } of [
    {
      input: "!w madeira",
      expected: ["https://duckduckgo.com/?q=weather+madeira"],
    },
    {
      input: "!w",
      expected: ["https://duckduckgo.com/?q=weather+"],
    },
    {
      input: "!o search project ideas",
      expected: ["obsidian://search?query=project%20ideas", "this://close"],
    },
    {
      input: "!o",
      expected: ["obsidian://daily", "this://close"],
    },
    {
      input: "!o just finished joomp!",
      expected: [
        "obsidian://quickadd?daily=true&choice=journal&value-journal%18entry=just%20finished%20joomp!",
        "this://close",
      ],
    },
    {
      input: "!todo x finished joomp",
      expected: [
        "obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text=finished%20joomp",
        "this://close",
      ],
    },
    {
      input: "!todo buy groceries",
      expected: [
        "obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text=buy%20groceries",
        "this://close",
      ],
    },
    {
      input: "!todo",
      expected: ["obsidian://daily", "this://close"],
    },
    {
      input: "!pp explain quantum computing",
      expected: [
        "https://perplexity.ai/search?q=explain%20quantum%20computing",
      ],
    },
    {
      input: "!pp",
      expected: ["https://perplexity.ai"],
    },
    {
      input: "how do open source licenses work",
      expected: [
        "https://duckduckgo.com/?q=how%20do%20open%20source%20licenses%20work",
      ],
    },
  ]) {
    test(`"${input}" -> ${expected.join(", ")} `, () => {
      const result = executeCommand(input, EXAMPLE_CONFIG);
      expect(result.join(", ")).toEqual(expected.join(", "));
    });
  }
});

describe("serializeCommandTree / deserializeCommandTree", () => {
  // Helper to compare trees including symbol keys
  function treesEqual(
    a: CommandDefinitionTree,
    b: CommandDefinitionTree,
  ): boolean {
    // Check MATCH_ALL
    const aMatchAll = a[MATCH_ALL];
    const bMatchAll = b[MATCH_ALL];
    if (aMatchAll.length !== bMatchAll.length) return false;
    for (let i = 0; i < aMatchAll.length; i++) {
      if (aMatchAll[i] !== bMatchAll[i]) return false;
    }

    // Check MATCH_NONE
    const aMatchNone = a[MATCH_NONE];
    const bMatchNone = b[MATCH_NONE];
    if ((aMatchNone === undefined) !== (bMatchNone === undefined)) return false;
    if (aMatchNone && bMatchNone) {
      if (aMatchNone.length !== bMatchNone.length) return false;
      for (let i = 0; i < aMatchNone.length; i++) {
        if (aMatchNone[i] !== bMatchNone[i]) return false;
      }
    }

    // Check string keys
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i]) return false;
      if (!treesEqual(a[aKeys[i]], b[bKeys[i]])) return false;
    }

    return true;
  }

  test("round-trip: simple tree with MATCH_ALL only", () => {
    const tree: CommandDefinitionTree = {
      [MATCH_ALL]: ["https://example.com/?q={{{s}}}"],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });

  test("round-trip: tree with MATCH_NONE and MATCH_ALL", () => {
    const tree: CommandDefinitionTree = {
      [MATCH_NONE]: ["https://example.com/home"],
      [MATCH_ALL]: ["https://example.com/?q={{{s}}}"],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });

  test("round-trip: nested subcommands", () => {
    const tree: CommandDefinitionTree = {
      "!g": {
        [MATCH_ALL]: ["https://google.com/?q={{{s}}}"],
      },
      "!w": {
        [MATCH_ALL]: ["https://en.wikipedia.org/wiki/{{{s}}}"],
      },
      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });

  test("round-trip: deeply nested subcommands", () => {
    const tree: CommandDefinitionTree = {
      "!todo": {
        x: {
          [MATCH_ALL]: ["action://complete?text={{{s}}}"],
        },
        add: {
          urgent: {
            [MATCH_ALL]: ["action://add?urgent=true&text={{{s}}}"],
          },
          [MATCH_ALL]: ["action://add?text={{{s}}}"],
        },
        [MATCH_NONE]: ["action://list"],
        [MATCH_ALL]: ["action://add?text={{{s}}}"],
      },
      [MATCH_ALL]: ["https://search.com/?q={{{s}}}"],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });

  test("round-trip: multiple payload strings", () => {
    const tree: CommandDefinitionTree = {
      "!o": {
        [MATCH_NONE]: ["obsidian://daily", "this://close", "other://action"],
        [MATCH_ALL]: [
          "obsidian://new?text={{{s}}}",
          "this://close",
          "notification://show",
        ],
      },
      [MATCH_ALL]: ["https://default.com"],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });

  test("round-trip: EXAMPLE_CONFIG (complex tree)", () => {
    const serialized = serializeCommandTree(EXAMPLE_CONFIG);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(EXAMPLE_CONFIG, deserialized)).toBe(true);
  });

  test("serialized output contains control characters (not JSON)", () => {
    const tree: CommandDefinitionTree = {
      "!g": {
        [MATCH_ALL]: ["https://google.com/?q={{{s}}}"],
      },
      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    };
    const serialized = serializeCommandTree(tree);

    // Should contain control characters
    expect(serialized.includes("\x1C")).toBe(true); // FS
    expect(serialized.includes("\x1D")).toBe(true); // GS
    expect(serialized.includes("\x1F")).toBe(true); // US

    // Should NOT look like JSON
    expect(serialized.startsWith("{")).toBe(false);
    expect(serialized.includes('"')).toBe(false);
  });

  test("serialized output contains RS for multiple payloads", () => {
    const tree: CommandDefinitionTree = {
      [MATCH_ALL]: ["url1", "url2", "url3"],
    };
    const serialized = serializeCommandTree(tree);
    expect(serialized.includes("\x1E")).toBe(true); // RS
  });

  test("round-trip: URLs with special characters", () => {
    const tree: CommandDefinitionTree = {
      "!test": {
        [MATCH_ALL]: [
          "https://example.com/path?a=1&b=2",
          "custom://app?param={{{s}}}&other=value",
        ],
      },
      [MATCH_ALL]: ["https://search.com/?q={{{s}}}&lang=en"],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });

  test("round-trip: empty payload arrays", () => {
    const tree: CommandDefinitionTree = {
      [MATCH_NONE]: [],
      [MATCH_ALL]: [],
    };
    const serialized = serializeCommandTree(tree);
    const deserialized = deserializeCommandTree(serialized);
    expect(treesEqual(tree, deserialized)).toBe(true);
  });
});

describe("redirectDataToTree / treeToRedirectData", () => {
  test("converts simple flat data to tree", () => {
    const data: RedirectData[] = [
      { bangs: ["!g"], urls: ["google.com/?q={{{s}}}"] },
      { bangs: ["!yt"], urls: ["youtube.com/results?search_query={{{s}}}"] },
    ];

    const tree = redirectDataToTree(data);

    expect(tree["!g"][MATCH_ALL]).toEqual(["google.com/?q={{{s}}}"]);
    expect(tree["!yt"][MATCH_ALL]).toEqual([
      "youtube.com/results?search_query={{{s}}}",
    ]);
    // First entry becomes root fallback
    expect(tree[MATCH_ALL]).toEqual(["google.com/?q={{{s}}}"]);
  });

  test("converts nested bang chains to tree", () => {
    const data: RedirectData[] = [
      { bangs: ["!todo", "x"], urls: ["action://complete?text={{{s}}}"] },
      { bangs: ["!todo"], urls: ["action://add?text={{{s}}}"] },
    ];

    const tree = redirectDataToTree(data);

    expect(tree["!todo"]["x"][MATCH_ALL]).toEqual([
      "action://complete?text={{{s}}}",
    ]);
    expect(tree["!todo"][MATCH_ALL]).toEqual(["action://add?text={{{s}}}"]);
  });

  test("converts data with multiple URLs to tree", () => {
    const data: RedirectData[] = [
      {
        bangs: ["!o"],
        urls: ["obsidian://daily", "this://close"],
      },
    ];

    const tree = redirectDataToTree(data);

    expect(tree["!o"][MATCH_ALL]).toEqual(["obsidian://daily", "this://close"]);
  });

  test("treeToRedirectData flattens tree structure", () => {
    const tree: CommandDefinitionTree = {
      "!g": { [MATCH_ALL]: ["google.com/?q={{{s}}}"] },
      "!todo": {
        x: { [MATCH_ALL]: ["action://complete"] },
        [MATCH_ALL]: ["action://add"],
      },
      [MATCH_ALL]: ["default.com"],
    };

    const data = treeToRedirectData(tree);

    // Should contain entries for !g, !todo, and !todo x
    expect(data.some((d) => d.bangs.join(",") === "!g")).toBe(true);
    expect(data.some((d) => d.bangs.join(",") === "!todo")).toBe(true);
    expect(data.some((d) => d.bangs.join(",") === "!todo,x")).toBe(true);
  });

  test("treeToRedirectData preserves multiple URLs", () => {
    const tree: CommandDefinitionTree = {
      "!o": {
        [MATCH_ALL]: ["obsidian://daily", "this://close", "other://app"],
      },
      [MATCH_ALL]: ["default.com"],
    };

    const data = treeToRedirectData(tree);

    const entry = data.find((d) => d.bangs.join(",") === "!o");
    expect(entry).toBeDefined();
    expect(entry!.urls).toEqual([
      "obsidian://daily",
      "this://close",
      "other://app",
    ]);
  });

  test("round-trip: RedirectData -> Tree -> RedirectData preserves data", () => {
    const original: RedirectData[] = [
      { bangs: ["!g"], urls: ["google.com/?q={{{s}}}"] },
      { bangs: ["!yt"], urls: ["youtube.com/results?search_query={{{s}}}"] },
    ];

    const tree = redirectDataToTree(original);
    const roundTripped = treeToRedirectData(tree);

    // Check that all original entries exist in round-tripped data
    for (const entry of original) {
      const found = roundTripped.find(
        (d) =>
          d.bangs.join(",") === entry.bangs.join(",") &&
          d.urls.join(",") === entry.urls.join(","),
      );
      expect(found).toBeDefined();
    }
  });

  test("round-trip preserves multiple URLs", () => {
    const original: RedirectData[] = [
      {
        bangs: ["!o"],
        urls: ["obsidian://daily", "this://close"],
      },
      {
        bangs: ["!todo"],
        urls: ["action://add?text={{{s}}}", "notification://show"],
      },
    ];

    const tree = redirectDataToTree(original);
    const roundTripped = treeToRedirectData(tree);

    for (const entry of original) {
      const found = roundTripped.find(
        (d) =>
          d.bangs.join(",") === entry.bangs.join(",") &&
          d.urls.join(",") === entry.urls.join(","),
      );
      expect(found).toBeDefined();
    }
  });

  test("full pipeline: RedirectData -> Tree -> DSL -> Tree -> RedirectData", () => {
    const original: RedirectData[] = [
      { bangs: ["!g"], urls: ["google.com/?q={{{s}}}"] },
      { bangs: ["!todo", "x"], urls: ["action://complete"] },
      { bangs: ["!todo"], urls: ["action://add"] },
    ];

    const tree = redirectDataToTree(original);
    const serialized = serializeCommandTree(tree);
    const deserializedTree = deserializeCommandTree(serialized);
    const roundTripped = treeToRedirectData(deserializedTree);

    // Check that all original entries exist in round-tripped data
    for (const entry of original) {
      const found = roundTripped.find(
        (d) =>
          d.bangs.join(",") === entry.bangs.join(",") &&
          d.urls.join(",") === entry.urls.join(","),
      );
      expect(found).toBeDefined();
    }
  });

  test("full pipeline preserves multiple URLs", () => {
    const original: RedirectData[] = [
      {
        bangs: ["!o"],
        urls: ["obsidian://daily", "this://close", "other://action"],
      },
    ];

    const tree = redirectDataToTree(original);
    const serialized = serializeCommandTree(tree);
    const deserializedTree = deserializeCommandTree(serialized);
    const roundTripped = treeToRedirectData(deserializedTree);

    const entry = roundTripped.find((d) => d.bangs.join(",") === "!o");
    expect(entry).toBeDefined();
    expect(entry!.urls).toEqual([
      "obsidian://daily",
      "this://close",
      "other://action",
    ]);
  });

  test("handles empty data", () => {
    const data: RedirectData[] = [];
    const tree = redirectDataToTree(data);

    expect(tree[MATCH_ALL]).toEqual([]);
  });

  test("filters out entries with empty bangs or urls", () => {
    const data: RedirectData[] = [
      { bangs: [], urls: ["should-be-ignored.com"] },
      { bangs: ["!valid"], urls: [] },
      { bangs: ["!g"], urls: ["google.com"] },
    ];

    const tree = redirectDataToTree(data);

    // Only !g should be present
    expect(tree["!g"]).toBeDefined();
    expect(Object.keys(tree).length).toBe(1);
  });
});

describe("treeToDsl / dslToTree", () => {
  test("treeToDsl(EXAMPLE_CONFIG) matches expected DSL format", () => {
    const dsl = treeToDsl(EXAMPLE_CONFIG);
    expect(dsl).toEqual(EXPECTED_DSL.trim());
  });

  test("round-trip: dslToTree(treeToDsl(tree)) preserves structure", () => {
    const dsl = treeToDsl(EXAMPLE_CONFIG);
    const tree = dslToTree(dsl);
    const dsl2 = treeToDsl(tree);
    expect(dsl2).toEqual(dsl);
  });
});
