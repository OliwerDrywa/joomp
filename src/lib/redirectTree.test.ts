import { describe, expect, test } from "bun:test";
import RedirectMap, {
  type AbstractTree,
  type CaptureGroup,
  type CaptureEntry,
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
      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
  },

  {
    label: "double url",

    tree: {
      [MATCH_ALL]: [
        "obsidian://quickadd&choice=log&value-search%18query={{{s}}}",
        "https://duckduckgo.com/?q={{{s}}}",
      ],
    },

    dsl: `
      ... => ["obsidian://quickadd&choice=log&value-search%18query={{{s}}}","https://duckduckgo.com/?q={{{s}}}"]
    `,
  },

  {
    label: "should ignore `# comments` in dsl",

    tree: {
      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      # !pp ... => https://perplexity.ai/search?q={{{s}}}
      ... => https://duckduckgo.com/?q={{{s}}}

      # p.s.: have a nice day
    `,
  },

  {
    label: "nested #0",

    tree: {
      "!pp": {
        [MATCH_ALL]: ["https://perplexity.ai/search?q={{{s}}}"],
      },
      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp ... => https://perplexity.ai/search?q={{{s}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
  },

  {
    label: "nested #1",

    tree: {
      "!pp": {
        [MATCH_NONE]: ["https://perplexity.ai"],
        [MATCH_ALL]: ["https://perplexity.ai/search?q={{{s}}}"],
      },

      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp => https://perplexity.ai
      !pp ... => https://perplexity.ai/search?q={{{s}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
  },

  {
    label: "nested #2",

    tree: {
      "!pp": {
        [MATCH_NONE]: ["https://perplexity.ai"],
        [MATCH_ALL]: ["https://perplexity.ai/search?q={{{s}}}"],
      },

      "!w": {
        [MATCH_ALL]: ["https://duckduckgo.com/?q=weather+{{{s}}}"],
      },

      "!steam": {
        [MATCH_ALL]: ["steam://open/bigpicture"],
      },

      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp => https://perplexity.ai
      !pp ... => https://perplexity.ai/search?q={{{s}}}
      !w ... => https://duckduckgo.com/?q=weather+{{{s}}}
      !steam ... => steam://open/bigpicture
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
  },

  {
    label: "nested #3",

    tree: {
      "!test": {
        [MATCH_ALL]: [
          "https://example.com/path?a=1&b=2",
          "custom://app?param={{{s}}}&other=value",
        ],
      },
      [MATCH_ALL]: ["https://search.com/?q={{{s}}}&lang=en"],
    },

    dsl: `
      !test ... => ["https://example.com/path?a=1&b=2","custom://app?param={{{s}}}&other=value"]
      ... => https://search.com/?q={{{s}}}&lang=en
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

      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !o => obsidian://daily
      !o search ... => obsidian://search?query={{{s}}}
      !o ... => obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
  },

  {
    label: "deeply nested #2",

    tree: {
      "!pp": {
        [MATCH_NONE]: ["https://perplexity.ai"],
        [MATCH_ALL]: ["https://perplexity.ai/search?q={{{s}}}"],
      },

      "!w": {
        [MATCH_ALL]: ["https://duckduckgo.com/?q=weather+{{{s}}}"],
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

      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },

    dsl: `
      !pp => https://perplexity.ai
      !pp ... => https://perplexity.ai/search?q={{{s}}}
      !w ... => https://duckduckgo.com/?q=weather+{{{s}}}
      !o => obsidian://daily
      !o search ... => obsidian://search?query={{{s}}}
      !o ... => obsidian://quickadd?daily=true&choice=journal&value-journal%18entry={{{s}}}
      !todo => obsidian://daily
      !todo x ... => obsidian://quickadd?daily=true&choice=completed-todo&value-to%18do%20text={{{s}}}
      !todo ... => obsidian://quickadd?daily=true&choice=todo&value-to%18do%20text={{{s}}}
      !steam ... => ["obsidian://quickadd?choice=gaming%20log","steam://open/bigpicture"]
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
  },
] as { label: string; tree: AbstractTree; dsl: string }[];

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
    const str = new RedirectMap(tree).serialize();

    test(label, () => {
      expect(RedirectMap.deserialize(str).tree).toEqual(tree);
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
    output: ["https://duckduckgo.com"],
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
    input: "!wiki foo",
    output: ["http://en.wikipedia.org/wiki/Special:Search?search=foo&go=Go"],
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
      let redirectedTo: undefined | string;
      const newTabs = [] as string[];

      global.window = {
        open(url: string, target: string) {
          if (target === "_self") return;
          newTabs.push(url);
        },

        document: { title: "➜ ..." },

        location: {
          search: new URLSearchParams({
            q: encodeURI(input),
            b: new RedirectMap(NAVIGATION_TREE).serialize(),
          }),

          replace(url: string) {
            console.log("settings redirectTo to", url);
            redirectedTo = url;
          },
        },
        writable: true,
      } as any;

      redirect();
      if (output.length === 1) {
        expect(redirectedTo).toBe(output[0]);
        expect(newTabs.length).toEqual(0);
      } else {
        expect(redirectedTo).toBeUndefined();
        expect(newTabs).toEqual(output);
      }
    });
  }
});

// ============================================================
// Multi-Capture Param Tests
// ============================================================

const MULTI_CAPTURE_DSL_CASES = [
  {
    label: "two captures with delimiter",

    dsl: `
      !query place ... name ... => https://querysite.com/?name={{{1}}}&place={{{0}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,

    tree: {
      "!query": {
        place: {
          [MATCH_ALL]: {
            delimiters: [["name"]],
            urls: ["https://querysite.com/?name={{{1}}}&place={{{0}}}"],
          } satisfies CaptureEntry,
        },
        [MATCH_ALL]: [],
      },
      [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
    },
  },

  {
    label: "three captures with two delimiters",

    dsl: `
      !flight from ... to ... on ... => https://flights.com/?from={{{0}}}&to={{{1}}}&date={{{2}}}
    `,

    tree: {
      "!flight": {
        from: {
          [MATCH_ALL]: {
            delimiters: [["to"], ["on"]],
            urls: [
              "https://flights.com/?from={{{0}}}&to={{{1}}}&date={{{2}}}",
            ],
          } satisfies CaptureEntry,
        },
        [MATCH_ALL]: [],
      },
      [MATCH_ALL]: [],
    },
  },

  {
    label: "multi-word delimiter",

    dsl: `
      !search in ... for ... => https://example.com/search?scope={{{0}}}&q={{{1}}}
    `,

    tree: {
      "!search": {
        in: {
          [MATCH_ALL]: {
            delimiters: [["for"]],
            urls: ["https://example.com/search?scope={{{0}}}&q={{{1}}}"],
          } satisfies CaptureEntry,
        },
        [MATCH_ALL]: [],
      },
      [MATCH_ALL]: [],
    },
  },

  {
    label: "same command with alternate capture delimiters",

    dsl: `
      !w ... 0 ... => https://duckduckgo.com/?q=weather+{{{0}}}
      !w ... 1 ... => https://duckduckgo.com/?q=weather+{{{1}}}
    `,

    tree: {
      "!w": {
        [MATCH_ALL]: [
          {
            delimiters: [["0"]],
            urls: ["https://duckduckgo.com/?q=weather+{{{0}}}"],
          },
          {
            delimiters: [["1"]],
            urls: ["https://duckduckgo.com/?q=weather+{{{1}}}"],
          },
        ] satisfies CaptureEntry[],
      },
      [MATCH_ALL]: [],
    },
  },

  {
    label: "plain wildcard and capture alternative on same prefix",

    dsl: `
      !q vehicle phvl ... => https://duckduckgo.com/?q=phvl+query+{{{s}}}
      !q vehicle phvl ... council ... => https://duckduckgo.com/?q=phvl+query+{{{0}}}+with+council+{{{1}}}
      !q vehicle council ... phvl ... => https://duckduckgo.com/?q=phvl+query+{{{1}}}+with+council+{{{0}}}
    `,

    tree: {
      "!q": {
        vehicle: {
          phvl: {
            [MATCH_ALL]: {
              urls: ["https://duckduckgo.com/?q=phvl+query+{{{s}}}"],
              captures: [
                {
                  delimiters: [["council"]],
                  urls: [
                    "https://duckduckgo.com/?q=phvl+query+{{{0}}}+with+council+{{{1}}}",
                  ],
                },
              ],
            } satisfies CaptureGroup,
          },
          council: {
            [MATCH_ALL]: {
              delimiters: [["phvl"]],
              urls: [
                "https://duckduckgo.com/?q=phvl+query+{{{1}}}+with+council+{{{0}}}",
              ],
            } satisfies CaptureEntry,
          },
          [MATCH_ALL]: [],
        },
        [MATCH_ALL]: [],
      },
      [MATCH_ALL]: [],
    },
  },
] as { label: string; tree: AbstractTree; dsl: string }[];

describe("Multi-Capture > DSL roundtrip", () => {
  for (const { label, tree } of MULTI_CAPTURE_DSL_CASES) {
    const dsl = new RedirectMap(tree).toDSL();

    test(label, () => {
      const parsed = RedirectMap.fromDSL(dsl).tree;
      expect(parsed).toEqual(tree);
    });
  }
});

describe("Multi-Capture > RedirectMap.fromDSL()", () => {
  for (const { label, tree, dsl } of MULTI_CAPTURE_DSL_CASES) {
    test(label, () => {
      expect(RedirectMap.fromDSL(dsl).tree).toEqual(tree);
    });
  }
});

describe("Multi-Capture > Serialization roundtrip", () => {
  for (const { label, tree } of MULTI_CAPTURE_DSL_CASES) {
    test(label, () => {
      const str = new RedirectMap(tree).serialize();
      expect(RedirectMap.deserialize(str).tree).toEqual(tree);
    });
  }
});

const MULTI_CAPTURE_NAVIGATION_CASES = [
  {
    label: "two captures: place and name",
    dsl: `
      !query place ... name ... => https://querysite.com/?name={{{1}}}&place={{{0}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
    input: "!query place tokyo name john",
    output: ["https://querysite.com/?name=john&place=tokyo"],
  },
  {
    label: "two captures: multi-word values",
    dsl: `
      !query place ... name ... => https://querysite.com/?name={{{1}}}&place={{{0}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
    input: "!query place new york city name john doe",
    output: ["https://querysite.com/?name=john%20doe&place=new%20york%20city"],
  },
  {
    label: "three captures: flight search",
    dsl: `
      !flight from ... to ... on ... => https://flights.com/?from={{{0}}}&to={{{1}}}&date={{{2}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
    input: "!flight from new york to los angeles on 2025-06-15",
    output: [
      "https://flights.com/?from=new%20york&to=los%20angeles&date=2025-06-15",
    ],
  },
  {
    label: "{{{s}}} alias for {{{0}}}",
    dsl: `
      !query place ... name ... => https://querysite.com/?name={{{s}}}&place={{{1}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
    input: "!query place tokyo name john",
    output: ["https://querysite.com/?name=tokyo&place=john"],
  },
  {
    label: "fallback to global wildcard",
    dsl: `
      !query place ... name ... => https://querysite.com/?name={{{1}}}&place={{{0}}}
      ... => https://duckduckgo.com/?q={{{s}}}
    `,
    input: "how does this work",
    output: ["https://duckduckgo.com/?q=how%20does%20this%20work"],
  },
  {
    label: "same command uses first capture alternative",
    dsl: `
      !w ... 0 ... => https://duckduckgo.com/?q=weather+{{{0}}}
      !w ... 1 ... => https://duckduckgo.com/?q=weather+{{{1}}}
    `,
    input: "!w madeira 0 porto",
    output: ["https://duckduckgo.com/?q=weather+madeira"],
  },
  {
    label: "same command uses second capture alternative",
    dsl: `
      !w ... 0 ... => https://duckduckgo.com/?q=weather+{{{0}}}
      !w ... 1 ... => https://duckduckgo.com/?q=weather+{{{1}}}
    `,
    input: "!w madeira 1 porto",
    output: ["https://duckduckgo.com/?q=weather+porto"],
  },
  {
    label: "plain wildcard survives capture alternative",
    dsl: `
      !q vehicle phvl ... => https://duckduckgo.com/?q=phvl+query+{{{s}}}
      !q vehicle phvl ... council ... => https://duckduckgo.com/?q=phvl+query+{{{0}}}+with+council+{{{1}}}
      !q vehicle council ... phvl ... => https://duckduckgo.com/?q=phvl+query+{{{1}}}+with+council+{{{0}}}
    `,
    input: "!q vehicle phvl honda civic",
    output: ["https://duckduckgo.com/?q=phvl+query+honda%20civic"],
  },
  {
    label: "capture alternative overrides plain wildcard",
    dsl: `
      !q vehicle phvl ... => https://duckduckgo.com/?q=phvl+query+{{{s}}}
      !q vehicle phvl ... council ... => https://duckduckgo.com/?q=phvl+query+{{{0}}}+with+council+{{{1}}}
      !q vehicle council ... phvl ... => https://duckduckgo.com/?q=phvl+query+{{{1}}}+with+council+{{{0}}}
    `,
    input: "!q vehicle phvl honda civic council bristol",
    output: [
      "https://duckduckgo.com/?q=phvl+query+honda%20civic+with+council+bristol",
    ],
  },
  {
    label: "reversed capture alternative still works",
    dsl: `
      !q vehicle phvl ... => https://duckduckgo.com/?q=phvl+query+{{{s}}}
      !q vehicle phvl ... council ... => https://duckduckgo.com/?q=phvl+query+{{{0}}}+with+council+{{{1}}}
      !q vehicle council ... phvl ... => https://duckduckgo.com/?q=phvl+query+{{{1}}}+with+council+{{{0}}}
    `,
    input: "!q vehicle council bristol phvl honda civic",
    output: [
      "https://duckduckgo.com/?q=phvl+query+honda%20civic+with+council+bristol",
    ],
  },
];

describe("Multi-Capture > Navigation", () => {
  for (const { label, dsl, input, output } of MULTI_CAPTURE_NAVIGATION_CASES) {
    test(label, () => {
      const map = RedirectMap.fromDSL(dsl);
      const result = map.getRedirectUrls(input);
      expect(result).toEqual(output);
    });
  }
});
