import { describe, expect, test } from "bun:test";
import RedirectMap, {
  type RedirectTree,
  MATCH_ALL,
  MATCH_NONE,
} from "./redirectTree";
import redirect from "./redirect";

const DSL_TEST_CASES = [
  {
    label: "empty",

    tree: {
      [MATCH_ALL]: [],
    },

    dsl: "",
  },

  {
    label: "single url",

    tree: {
      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      ... => ["duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "double url",

    tree: {
      [MATCH_ALL]: [
        "obsidian://quickadd&choice=log&value-search%18query={{{s}}}",
        "duckduckgo.com/?q={{{s}}}",
      ],
    },

    dsl: `
      ... => ["obsidian://quickadd&choice=log&value-search%18query={{{s}}}","duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "should ignore `# comments` in dsl",

    tree: {
      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      # !pp ... => ["perplexity.ai/search?q={{{s}}}"]
      ... => ["duckduckgo.com/?q={{{s}}}"]

      # p.s.: have a nice day
    `,
  },

  {
    label: "nested #0",

    tree: {
      "!pp": {
        [MATCH_ALL]: ["perplexity.ai/search?q={{{s}}}"],
      },
      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp ... => ["perplexity.ai/search?q={{{s}}}"]
      ... => ["duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "nested #1",

    tree: {
      "!pp": {
        [MATCH_NONE]: ["perplexity.ai"],
        [MATCH_ALL]: ["perplexity.ai/search?q={{{s}}}"],
      },

      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp => ["perplexity.ai"]
      !pp ... => ["perplexity.ai/search?q={{{s}}}"]
      ... => ["duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "nested #2",

    tree: {
      "!pp": {
        [MATCH_NONE]: ["perplexity.ai"],
        [MATCH_ALL]: ["perplexity.ai/search?q={{{s}}}"],
      },

      "!w": {
        [MATCH_ALL]: ["duckduckgo.com/?q=weather+{{{s}}}"],
      },

      "!steam": {
        [MATCH_ALL]: ["steam://open/bigpicture"],
      },

      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp => ["perplexity.ai"]
      !pp ... => ["perplexity.ai/search?q={{{s}}}"]
      !w ... => ["duckduckgo.com/?q=weather+{{{s}}}"]
      !steam ... => ["steam://open/bigpicture"]
      ... => ["duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "nested #3",

    tree: {
      "!test": {
        [MATCH_ALL]: [
          "example.com/path?a=1&b=2",
          "custom://app?param={{{s}}}&other=value",
        ],
      },
      [MATCH_ALL]: ["search.com/?q={{{s}}}&lang=en"],
    },

    dsl: `
      !test ... => ["example.com/path?a=1&b=2","custom://app?param={{{s}}}&other=value"]
      ... => ["search.com/?q={{{s}}}&lang=en"]
    `,
  },

  {
    label: "deeply nested #1",

    tree: {
      "!o": {
        search: {
          [MATCH_ALL]: ["obsidian://search?query={{{s}}}"],
        },
        [MATCH_NONE]: ["obsidian://daily"],
        [MATCH_ALL]: [
          "obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}",
        ],
      },

      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !o => ["obsidian://daily"]
      !o search ... => ["obsidian://search?query={{{s}}}"]
      !o ... => ["obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}"]
      ... => ["duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "deeply nested #2",

    tree: {
      "!pp": {
        [MATCH_NONE]: ["perplexity.ai"],
        [MATCH_ALL]: ["perplexity.ai/search?q={{{s}}}"],
      },

      "!w": {
        [MATCH_ALL]: ["duckduckgo.com/?q=weather+{{{s}}}"],
      },

      "!o": {
        search: {
          [MATCH_ALL]: ["obsidian://search?query={{{s}}}"],
        },
        [MATCH_NONE]: ["obsidian://daily"],
        [MATCH_ALL]: [
          "obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}",
        ],
      },

      "!todo": {
        x: {
          [MATCH_ALL]: [
            "obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}",
          ],
        },
        [MATCH_NONE]: ["obsidian://daily"],
        [MATCH_ALL]: [
          "obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}",
        ],
      },

      "!steam": {
        [MATCH_ALL]: [
          "obsidian://quickadd?choice=gaming%20log",
          "steam://open/bigpicture",
        ],
      },

      [MATCH_ALL]: ["duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp => ["perplexity.ai"]
      !pp ... => ["perplexity.ai/search?q={{{s}}}"]
      !w ... => ["duckduckgo.com/?q=weather+{{{s}}}"]
      !o => ["obsidian://daily"]
      !o search ... => ["obsidian://search?query={{{s}}}"]
      !o ... => ["obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}"]
      !todo => ["obsidian://daily"]
      !todo x ... => ["obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}"]
      !todo ... => ["obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}"]
      !steam ... => ["obsidian://quickadd?choice=gaming%20log","steam://open/bigpicture"]
      ... => ["duckduckgo.com/?q={{{s}}}"]
    `,
  },
] as { label: string; tree: RedirectTree; dsl: string }[];

describe("DSL > roundtrip", () => {
  for (const { label, tree } of DSL_TEST_CASES) {
    const dsl = new RedirectMap(tree).toDSL();

    test(label, () => {
      expect(RedirectMap.fromDSL(dsl).tree).toEqual(tree);
    });
  }
});

describe("DSL > RedirectMap.fromDSL()", () => {
  for (const { label, tree, dsl } of DSL_TEST_CASES) {
    test(label, () => {
      expect(RedirectMap.fromDSL(dsl).tree).toEqual(tree);
    });
  }
});

describe("DSL > RedirectMap.toDSL()", () => {
  for (const { label, tree, dsl } of DSL_TEST_CASES) {
    test(label, () => {
      expect(new RedirectMap(tree).toDSL()).toBe(
        dsl
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line)
          .filter((line) => !line.startsWith("#"))
          .join("\n"),
      );
    });
  }
});

describe("Stringification > roundtrip", () => {
  for (const { label, tree } of DSL_TEST_CASES) {
    const str = new RedirectMap(tree).toString();

    test(label, () => {
      expect(RedirectMap.fromString(str).tree).toEqual(tree);
    });
  }
});

const NAVIGATION_TREE = DSL_TEST_CASES.at(-1)!.tree;
const NAVIGATION_TEST_CASES = [
  {
    input: "!w madeira",
    output: ["https://duckduckgo.com/?q=weather+madeira"],
  },
  {
    input: "!w",
    output: ["https://duckduckgo.com/?q=weather+"],
  },
  {
    input: "!o search project ideas",
    output: ["obsidian://search?query=project%20ideas"],
  },
  {
    input: "!o",
    output: ["obsidian://daily"],
  },
  {
    input: "!o just finished joomp!",
    output: [
      "obsidian://quickadd?daily=true&choice=journal&value-journal%18entry=just%20finished%20joomp!",
    ],
  },
  {
    input: "!todo x finished joomp",
    output: [
      "obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text=finished%20joomp",
    ],
  },
  {
    input: "!todo buy groceries",
    output: [
      "obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text=buy%20groceries",
    ],
  },
  {
    input: "!todo",
    output: ["obsidian://daily"],
  },
  {
    input: "!steam",
    output: [
      "obsidian://quickadd?choice=gaming%20log",
      "steam://open/bigpicture",
    ],
  },
  {
    input: "!pp explain quantum computing",
    output: ["https://perplexity.ai/search?q=explain%20quantum%20computing"],
  },
  {
    input: "!pp",
    output: ["https://perplexity.ai"],
  },
  {
    input: "how do open source licenses work",
    output: [
      "https://duckduckgo.com/?q=how%20do%20open%20source%20licenses%20work",
    ],
  },
  {
    input: "!wiki",
    output: ["http://en.wikipedia.org/wiki/Special:Search?search=!wiki&go=Go"],
  },
];

describe("Redirects > RedirectMap.getRedirectUrls(...)", () => {
  for (const { input, output } of NAVIGATION_TEST_CASES) {
    test(`"${input}"`, () => {
      const result = new RedirectMap(NAVIGATION_TREE).getRedirectUrls(input);
      expect(result).toEqual(output);
    });
  }
});

describe("Redirects > redirect()", () => {
  for (const { input, output } of NAVIGATION_TEST_CASES) {
    test(`"${input}"`, () => {
      Object.defineProperty(global, "document", {
        value: { title: "" },
        writable: true,
      });

      const redirects = [] as string[];
      Object.defineProperty(global, "location", {
        value: {
          search: new URLSearchParams({
            q: encodeURI(input),
            b: new RedirectMap(NAVIGATION_TREE).toString(),
          }).toString(),

          replace(url: string) {
            redirects.push(url);
          },
        },
        writable: true,
      });

      // Object.defineProperty(global, "window", {
      //   value: { onblur() {} },
      //   writable: true,
      // });

      redirect();
      expect(redirects).toEqual(output);
    });
  }
});
