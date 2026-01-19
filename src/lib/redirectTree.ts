import defaultBangs from "@/lib/bangs.min.json";
import { compressToBase64, decompressFromBase64 } from "lz-string";
// import { parseQuery } from "./redirect";

function treeToDsl(tree: RedirectTree) {
  const lines: string[] = [];

  /**
   * Collect all command entries from a tree by walking it recursively.
   * Order: MATCH_NONE first, then subcommands, then MATCH_ALL last.
   */
  function collectEntries(tree: RedirectTree, prefix: string[] = []) {
    const entries: { words: string[]; urls: string[] }[] = [];

    // 1. Handle MATCH_NONE first (exact match, no trailing text)
    if (tree[MATCH_NONE] && tree[MATCH_NONE].length > 0) {
      entries.push({
        words: prefix,
        urls: [...tree[MATCH_NONE]],
      });
    }

    // 2. Handle string keys (subcommands) in the middle
    for (const key of Object.keys(tree)) {
      entries.push(...collectEntries(tree[key], [...prefix, key]));
    }

    // 3. Handle MATCH_ALL last (wildcard) - add "..." as a word
    if (tree[MATCH_ALL] && tree[MATCH_ALL].length > 0) {
      entries.push({
        words: [...prefix, "..."],
        urls: [...tree[MATCH_ALL]],
      });
    }

    return entries;
  }

  for (const { words, urls } of collectEntries(tree)) {
    const left = words.join(" ");
    lines.push(`${left} => ${JSON.stringify(urls)}`);
  }

  return lines.join("\n");
}
function dslToTree(dsl: string) {
  const tree: RedirectTree = {
    [MATCH_ALL]: [],
  };

  for (const rawLine of dsl.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue; // Skip empty lines and comments

    // Parse line: `words... => [urls]` or `words => [urls]`
    const arrowIndex = line.indexOf("=>");
    if (arrowIndex === -1) continue; // Invalid line, skip

    const left = line.slice(0, arrowIndex).trim();
    const right = line.slice(arrowIndex + 2).trim();

    // Parse URLs from JSON array
    let urls: string[];
    try {
      urls = JSON.parse(right);
      if (!Array.isArray(urls)) continue;
    } catch {
      continue; // Invalid JSON, skip line
    }
    if (urls.length === 0) continue;

    // Parse left side: `!cmd subword ...` or `!cmd subword` or `...`
    const words = left ? left.split(/\s+/) : [];
    const hasRest = words.at(-1) === "...";
    if (hasRest) words.pop(); // Remove "..." from words

    // Insert into tree
    let current = tree;
    for (const word of words) {
      if (!current[word]) {
        current[word] = { [MATCH_ALL]: [] };
      }
      current = current[word];
    }

    // Set the URLs at the final node
    if (hasRest) {
      current[MATCH_ALL] = urls;
    } else {
      current[MATCH_NONE] = urls;
    }
  }

  return tree;
}

function compress(str: string) {
  return compressToBase64(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
function decompress(str: string) {
  // Convert URL-safe base64 back to standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "="; // Add padding if needed

  return decompressFromBase64(base64);
}

// DSL control characters (ASCII separators)
const FS = "\x1C"; // File Separator - Node boundary
const GS = "\x1D"; // Group Separator - Entry separator
const RS = "\x1E"; // Record Separator - Payload separator
const US = "\x1F"; // Unit Separator - Key/value separator

// Special key mappings for stringification
const MATCH_NONE_KEY = "_";
const MATCH_ALL_KEY = "*";

export const MATCH_NONE = Symbol(MATCH_NONE_KEY);
export const MATCH_ALL = Symbol(MATCH_ALL_KEY);

export type RedirectTree = {
  [MATCH_NONE]?: string[];
  [word: string]: RedirectTree;
  [MATCH_ALL]: string[];
};

export const EXAMPLE_CONFIG = {
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
    [MATCH_ALL]: ["steam://open/bigpicture"],
  },

  [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
} as RedirectTree;

function stringify(tree: RedirectTree) {
  let result = FS;

  // Get all keys including symbols
  const symbolKeys = [] as (typeof MATCH_ALL | typeof MATCH_NONE)[];
  if (MATCH_ALL in tree) symbolKeys.push(MATCH_ALL);
  if (MATCH_NONE in tree) symbolKeys.push(MATCH_NONE);

  const stringKeys = Object.keys(tree);

  // Stringify string keys first (nested subtrees)
  for (const key of stringKeys) {
    const value = tree[key];
    const stringifiedValue = stringify(value);
    result += key + US + stringifiedValue + GS;
  }

  // Stringify symbol keys (payloads)
  for (const sym of symbolKeys) {
    const key = sym === MATCH_ALL ? MATCH_ALL_KEY : MATCH_NONE_KEY;
    const payload = tree[sym]!;
    const stringifiedPayload = payload.join(RS);
    result += key + US + stringifiedPayload + GS;
  }

  result += FS;
  return result;
}
function parse(compressed: string) {
  function parseNode(input: string, pos: number) {
    // Must start with FS
    if (input[pos] !== FS) {
      throw new Error(`Expected FS at position ${pos}`);
    }
    pos++;

    const tree: RedirectTree = {
      [MATCH_ALL]: [], // Required by type, will be populated if present
    };
    let hasMatchAll = false;

    // Parse entries until we hit closing FS
    while (pos < input.length && input[pos] !== FS) {
      // Find the key (up to US)
      const usPos = input.indexOf(US, pos);
      if (usPos === -1) {
        throw new Error(`Expected US after position ${pos}`);
      }
      const key = input.slice(pos, usPos);
      pos = usPos + 1;

      // Determine if value is a node or payload
      if (input[pos] === FS) {
        // It's a nested node
        const result = parseNode(input, pos);
        tree[key] = result.tree;
        pos = result.endPos;
      } else {
        // It's a payload - find the GS
        const gsPos = input.indexOf(GS, pos);
        if (gsPos === -1) {
          throw new Error(`Expected GS after position ${pos}`);
        }
        const payloadStr = input.slice(pos, gsPos);
        const payload = payloadStr === "" ? [] : payloadStr.split(RS);

        // Map special keys back to symbols
        if (key === MATCH_ALL_KEY) {
          tree[MATCH_ALL] = payload;
          hasMatchAll = true;
        } else if (key === MATCH_NONE_KEY) {
          tree[MATCH_NONE] = payload;
        } else {
          throw new Error(`Unexpected payload key: ${key}`);
        }
        pos = gsPos;
      }

      // Consume GS
      if (input[pos] === GS) {
        pos++;
      }
    }

    // Consume closing FS
    if (input[pos] !== FS) {
      throw new Error(`Expected closing FS at position ${pos}`);
    }
    pos++;

    // If no MATCH_ALL was found, remove the empty placeholder
    if (!hasMatchAll) {
      delete (tree as Record<symbol, unknown>)[MATCH_ALL];
      // Re-add as empty to satisfy type (tree must have MATCH_ALL per type definition)
      tree[MATCH_ALL] = [];
    }

    return { tree, endPos: pos };
  }

  return parseNode(compressed, 0).tree;
}

function defaultToHttps(uri: string) {
  if (uri.match(/^[a-zA-Z]+:\/\//)) return uri;
  return "https://" + uri;
}

export function insertUrlQuery(url: string, query: string) {
  // if the query is empty (after cutting out the bang `!gh`) -
  // use `https://github.com` instead of `https://github.com/search?q=
  if (!query && url.includes("{{{s}}}")) {
    return new URL(url).origin;
  }

  // Encode query, but preserve forward slashes for paths like `t3dotgg/unduck`
  const encodedQuery = encodeURIComponent(query).replace(/%2F/g, "/");
  return url.replaceAll("{{{s}}}", encodedQuery);
}

function getUrlsFromRedirectTree(
  query: string,
  tree: RedirectTree,
  getDefaultValue?: (query: string) => undefined | string[],
) {
  const nextWord = query.trimStart().match(/^\s*(\S+)/)?.[0];

  if (!nextWord && tree[MATCH_NONE]) {
    return tree[MATCH_NONE].map(defaultToHttps);
  }

  if (nextWord && tree[nextWord]) {
    return getUrlsFromRedirectTree(
      query.replace(/^\s*\S+/, ""),
      tree[nextWord],
    );
  }

  return (
    getDefaultValue?.(query) ??
    tree[MATCH_ALL].map((url) =>
      insertUrlQuery(defaultToHttps(url), query.trimStart()),
    )
  );
}

export default class RedirectMap {
  constructor(public tree: RedirectTree) {}

  static fromString(str: string) {
    return new RedirectMap(parse(decompress(str)));
  }

  toString() {
    return compress(stringify(this.tree));
  }

  static fromDSL(args: string): RedirectMap;
  static fromDSL(args: TemplateStringsArray): RedirectMap;
  static fromDSL(args: string | TemplateStringsArray) {
    const dsl = typeof args === "string" ? args : args[0];
    return new RedirectMap(dslToTree(dsl.trim()));
  }

  toDSL() {
    return treeToDsl(this.tree);
  }

  getRedirectUrls(q: string) {
    return getUrlsFromRedirectTree(q, this.tree, this.#defaultToDdgBangs);
  }

  #defaultToDdgBangs(q: string) {
    // cut bang (e.g.: `!gh`) out from query
    const bang = q.match(/!(\S+)/i)?.[1]?.toLowerCase();
    const query = q.replace(/!\S+\s*/i, "").trim(); // could be ""

    if (!bang) return;

    if (bang in defaultBangs) {
      type Key = keyof typeof defaultBangs;
      const url = defaultToHttps(defaultBangs[bang as Key]);

      return [insertUrlQuery(url, query)];
    }
  }
}
