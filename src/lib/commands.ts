export const MATCH_NONE = Symbol("∅");
export const MATCH_ALL = Symbol("𝕌");

export type CommandDefinitionTree = {
  [MATCH_NONE]?: string[];
  [word: string]: CommandDefinitionTree;
  [MATCH_ALL]: string[];
};

export const EXAMPLE_CONFIG: CommandDefinitionTree = {
  "!pp": {
    [MATCH_NONE]: ["perplexity.ai"],
    [MATCH_ALL]: ["perplexity.ai/search?q={{{s}}}"],
  },

  "!w": {
    [MATCH_ALL]: ["duckduckgo.com/?q=weather+{{{s}}}"],
  },

  "!o": {
    search: { [MATCH_ALL]: ["obsidian://search?query={{{s}}}"] },
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
    [MATCH_NONE]: ["steam://open/bigpicture"],
    [MATCH_ALL]: [],
  },

  [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
};

function defaultToHttps(uri: string) {
  if (uri.match(/^[a-zA-Z]+:\/\//)) return uri;
  return "https://" + uri;
}

function insertUrlQuery(url: string, query: string): string {
  // Encode query, but preserve forward slashes for paths like `t3dotgg/unduck`
  const encodedQuery = encodeURIComponent(query).replace(/%2F/g, "/");
  return url.replaceAll("{{{s}}}", encodedQuery);
}

// DSL control characters (ASCII separators)
const FS = "\x1C"; // File Separator - Node boundary
const GS = "\x1D"; // Group Separator - Entry separator
const RS = "\x1E"; // Record Separator - Payload separator
const US = "\x1F"; // Unit Separator - Key/value separator

// Special key mappings for serialization
const MATCH_ALL_KEY = "*";
const MATCH_NONE_KEY = "!";

export function serializeCommandTree(tree: CommandDefinitionTree) {
  let result = FS;

  // Get all keys including symbols
  const symbolKeys: Array<typeof MATCH_ALL | typeof MATCH_NONE> = [];
  if (MATCH_ALL in tree) symbolKeys.push(MATCH_ALL);
  if (MATCH_NONE in tree) symbolKeys.push(MATCH_NONE);

  const stringKeys = Object.keys(tree);

  // Serialize string keys first (nested subtrees)
  for (const key of stringKeys) {
    const value = tree[key];
    const serializedValue = serializeCommandTree(value);
    result += key + US + serializedValue + GS;
  }

  // Serialize symbol keys (payloads)
  for (const sym of symbolKeys) {
    const key = sym === MATCH_ALL ? MATCH_ALL_KEY : MATCH_NONE_KEY;
    const payload = tree[sym]!;
    const serializedPayload = payload.join(RS);
    result += key + US + serializedPayload + GS;
  }

  result += FS;
  return result;
}

export function deserializeCommandTree(serialized: string) {
  const result = parseNode(serialized, 0);
  return result.tree;
}

function parseNode(
  input: string,
  pos: number,
): { tree: CommandDefinitionTree; endPos: number } {
  // Must start with FS
  if (input[pos] !== FS) {
    throw new Error(`Expected FS at position ${pos}`);
  }
  pos++;

  const tree: CommandDefinitionTree = {
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

// Type for flat redirect data used by the editor UI
// Now supports multiple URLs per command
export type RedirectData = { bangs: string[]; urls: string[] };

/**
 * Convert flat RedirectData[] to CommandDefinitionTree.
 * Each entry with bangs [a, b] and urls becomes a nested tree: a -> b -> {MATCH_ALL: urls}
 * The first entry's URLs are also set as the root MATCH_ALL fallback.
 */
export function redirectDataToTree(
  data: RedirectData[],
): CommandDefinitionTree {
  const tree: CommandDefinitionTree = {
    [MATCH_ALL]: [],
  };

  // Set the first entry's URLs as the root fallback
  const firstValidEntry = data.find(
    (d) => d.bangs.length > 0 && d.urls.length > 0,
  );
  if (firstValidEntry) {
    tree[MATCH_ALL] = [...firstValidEntry.urls];
  }

  for (const { bangs, urls } of data) {
    if (bangs.length === 0 || urls.length === 0) continue;

    let current = tree;
    for (let i = 0; i < bangs.length; i++) {
      const bang = bangs[i];
      if (i === bangs.length - 1) {
        // Last bang: set the URLs
        if (!current[bang]) {
          current[bang] = { [MATCH_ALL]: [...urls] };
        } else {
          current[bang][MATCH_ALL] = [...urls];
        }
      } else {
        // Intermediate bang: create nested tree if needed
        if (!current[bang]) {
          current[bang] = { [MATCH_ALL]: [] };
        }
        current = current[bang];
      }
    }
  }

  return tree;
}

/**
 * Convert CommandDefinitionTree back to flat RedirectData[].
 * Flattens nested structure into bang chains, preserving all URLs.
 */
export function treeToRedirectData(
  tree: CommandDefinitionTree,
  prefix: string[] = [],
) {
  const result: RedirectData[] = [];

  // Add entries for string keys (nested subtrees)
  for (const key of Object.keys(tree)) {
    const subtree = tree[key];
    const newPrefix = [...prefix, key];

    // If subtree has MATCH_ALL with URLs, add as entry
    if (subtree[MATCH_ALL] && subtree[MATCH_ALL].length > 0) {
      result.push({
        bangs: newPrefix,
        urls: [...subtree[MATCH_ALL]], // Preserve all URLs
      });
    }

    // Recurse into nested subtrees
    result.push(...treeToRedirectData(subtree, newPrefix));
  }

  return result;
}

// --- DSL Serialization ---
// Format:
//   !cmd             => ["url"]             # MATCH_NONE (exact match)
//   !cmd subword ... => ["url1","url2"]     # subcommand with MATCH_ALL
//   !cmd ...         => ["url1","url2"]     # MATCH_ALL (wildcard)
//   ... => ["fallback-url"]                 # root fallback (last line)
//
// "..." is treated as a word meaning MATCH_ALL (match any remaining text)
// No "..." means MATCH_NONE (exact match)

type DslEntry = {
  words: string[]; // e.g., ["!o", "search", "..."] - "..." means MATCH_ALL
  urls: string[];
};

/**
 * Collect all command entries from a tree by walking it recursively.
 * Order: MATCH_NONE first, then subcommands, then MATCH_ALL last.
 */
function collectEntries(
  tree: CommandDefinitionTree,
  prefix: string[] = [],
): DslEntry[] {
  const entries: DslEntry[] = [];

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

/**
 * Serialize CommandDefinitionTree to DSL string.
 */
export function treeToDsl(tree: CommandDefinitionTree) {
  const lines: string[] = [];

  for (const { words, urls } of collectEntries(tree)) {
    const left = words.join(" ");
    lines.push(`${left} => ${JSON.stringify(urls)}`);
  }

  return lines.join("\n");
}

/**
 * Parse DSL string to CommandDefinitionTree.
 */
export function dslToTree(dsl: string) {
  const tree: CommandDefinitionTree = {
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

export function executeCommand(
  query: string,
  definitionTree: CommandDefinitionTree,
) {
  const nextWord = query.trimStart().match(/^\s*(\S+)/)?.[0];

  if (!nextWord && definitionTree[MATCH_NONE]) {
    return definitionTree[MATCH_NONE].map(defaultToHttps);
  }

  if (nextWord && definitionTree[nextWord]) {
    return executeCommand(
      query.replace(/^\s*\S+/, ""),
      definitionTree[nextWord],
    );
  }

  return definitionTree[MATCH_ALL].map(defaultToHttps).map((url) =>
    insertUrlQuery(url, query.trimStart()),
  );
}
