import { compressToBase64, decompressFromBase64 } from "lz-string";
import defaultBangs from "@/lib/bangs.min.json";

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

/**
 * Multi-capture pattern entry.
 * Used when a DSL line has multiple `...` separated by literal delimiters.
 *
 * Example: `!query place ... name ... => url?name={{{0}}}&place={{{1}}}`
 * - delimiters = ["name"] (literal words between captures)
 * - urls = ["url?name={{{0}}}&place={{{1}}}"]
 *
 * The captures are referenced positionally: {{{0}}} = first ..., {{{1}}} = second ..., etc.
 * {{{s}}} is an alias for {{{0}}} for backwards compatibility.
 */
export type CaptureEntry = {
  delimiters: string[][];
  urls: string[];
};

export type CaptureGroup = {
  urls: string[];
  captures: CaptureEntry[];
};

type MatchAllEntry = string[] | CaptureEntry | CaptureEntry[] | CaptureGroup;

export type AbstractTree = {
  [MATCH_NONE]?: string[];
  [word: string]: AbstractTree;
  [MATCH_ALL]: MatchAllEntry;
};

export function isCaptureEntry(
  value: unknown,
): value is CaptureEntry {
  return !!value && typeof value === "object" && "delimiters" in value;
}

function isCaptureEntries(value: MatchAllEntry): value is CaptureEntry[] {
  return Array.isArray(value) && value.length > 0 && value.every(isCaptureEntry);
}

function isCaptureGroup(value: unknown): value is CaptureGroup {
  return !!value && typeof value === "object" && "captures" in value;
}

function isUrlList(value: MatchAllEntry): value is string[] {
  return Array.isArray(value) && value.every((url) => typeof url === "string");
}

function getCaptureEntries(value: MatchAllEntry) {
  if (isCaptureEntry(value)) return [value];
  if (isCaptureEntries(value)) return value;
  if (isCaptureGroup(value)) return value.captures;
  return [];
}

function getWildcardUrls(value: MatchAllEntry) {
  if (isUrlList(value)) return value;
  if (isCaptureGroup(value)) return value.urls;
  return [];
}

function treeToDsl(tree: AbstractTree) {
  const lines: string[] = [];

  /**
   * Collect all command entries from a tree by walking it recursively.
   * Order: MATCH_NONE first, then subcommands, then MATCH_ALL last.
   */
  function collectEntries(tree: AbstractTree, prefix: string[] = []) {
    const entries: { words: string[]; urls: string[] }[] = [];

    if (tree[MATCH_NONE]?.length) {
      entries.push({ words: prefix, urls: [...tree[MATCH_NONE]] });
    }

    for (const key of Object.keys(tree)) {
      entries.push(...collectEntries(tree[key], [...prefix, key]));
    }

    const matchAll = tree[MATCH_ALL];
    if (matchAll && (Array.isArray(matchAll) ? matchAll.length > 0 : true)) {
      const wildcardUrls = getWildcardUrls(matchAll);
      const captureEntries = getCaptureEntries(matchAll);

      if (wildcardUrls.length > 0) {
        entries.push({ words: [...prefix, "..."], urls: [...wildcardUrls] });
      }

      if (captureEntries.length > 0) {
        // Multi-capture: rebuild the pattern with `...` and delimiters
        // e.g. prefix = ["!query", "place"], delimiters = [["name"]]
        // => "!query place ... name ..."
        for (const entry of captureEntries) {
          const parts = [...prefix, "..."];
          for (const delim of entry.delimiters) {
            parts.push(...delim, "...");
          }
          entries.push({ words: parts, urls: [...entry.urls] });
        }
      }
    }

    return entries;
  }

  for (const { words, urls } of collectEntries(tree)) {
    const left = words.join(" ");
    lines.push(
      urls.length === 1
        ? `${left} => ${urls[0]}`
        : `${left} => ${JSON.stringify(urls)}`,
    );
  }

  return lines.join("\n");
}

function dslToTree(dsl: string) {
  const tree: AbstractTree = { [MATCH_ALL]: [] };

  /** Walk the tree along the given words, creating nodes as needed. */
  function walkTree(words: string[]) {
    let current = tree;
    for (const word of words) {
      current[word] ??= { [MATCH_ALL]: [] };
      current = current[word];
    }
    return current;
  }

  for (const rawLine of dsl.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const arrowIndex = line.indexOf("=>");
    if (arrowIndex === -1) continue;

    const left = line.slice(0, arrowIndex).trim();
    const right = line.slice(arrowIndex + 2).trim();

    // Parse URLs from ["JSON array"] || "string" || string
    let urls: string[];
    try {
      urls = JSON.parse(right);
      if (!Array.isArray(urls) && typeof urls !== "string") throw null;
      if (typeof urls === "string") urls = [urls];
    } catch {
      urls = [right];
    }
    if (urls.length === 0) continue;

    const words = left ? left.split(/\s+/) : [];

    // Find all indices of "..." in words
    const restIndices = words.reduce<number[]>(
      (acc, w, i) => (w === "..." ? [...acc, i] : acc),
      [],
    );

    const hasRest = restIndices.length > 0;
    const isMultiCapture =
      restIndices.length > 1 ||
      (restIndices.length === 1 && restIndices[0] !== words.length - 1);

    if (isMultiCapture) {
      // Multi-capture: e.g. `!query place ... name ...`
      const prefix = words.slice(0, restIndices[0]);
      const delimiters: string[][] = [];
      for (let i = 0; i < restIndices.length - 1; i++) {
        delimiters.push(words.slice(restIndices[i] + 1, restIndices[i + 1]));
      }
      // Trailing literals after the last `...` become a final delimiter
      const trailing = words.slice(restIndices.at(-1)! + 1);
      if (trailing.length > 0) delimiters.push(trailing);

      const current = walkTree(prefix);
      const entry = { delimiters, urls };
      const matchAll = current[MATCH_ALL];

      current[MATCH_ALL] = isCaptureGroup(matchAll)
        ? { ...matchAll, captures: [...matchAll.captures, entry] }
        : isUrlList(matchAll) && matchAll.length > 0
          ? { urls: matchAll, captures: [entry] }
          : isCaptureEntry(matchAll)
            ? [matchAll, entry]
            : isCaptureEntries(matchAll)
              ? [...matchAll, entry]
              : entry;
    } else if (hasRest) {
      words.pop(); // Remove trailing "..."
      const current = walkTree(words);
      const matchAll = current[MATCH_ALL];

      current[MATCH_ALL] = isCaptureGroup(matchAll)
        ? { ...matchAll, urls }
        : isCaptureEntry(matchAll)
          ? { urls, captures: [matchAll] }
          : isCaptureEntries(matchAll)
            ? { urls, captures: matchAll }
            : urls;
    } else {
      walkTree(words)[MATCH_NONE] = urls;
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
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return decompressFromBase64(base64);
}

function serialize(tree: AbstractTree) {
  let result = FS;

  const symbolKeys = [] as (typeof MATCH_ALL | typeof MATCH_NONE)[];
  if (MATCH_ALL in tree) symbolKeys.push(MATCH_ALL);
  if (MATCH_NONE in tree) symbolKeys.push(MATCH_NONE);

  for (const key of Object.keys(tree)) {
    result += key + US + serialize(tree[key]) + GS;
  }

  for (const sym of symbolKeys) {
    const key = sym === MATCH_ALL ? MATCH_ALL_KEY : MATCH_NONE_KEY;
    const payload = tree[sym]!;
    let stringifiedPayload: string;

    if (isCaptureEntry(payload)) {
      // Multi-capture: "P<delimiters-json>\x1E<url1>\x1E<url2>..."
      stringifiedPayload =
        "P" + JSON.stringify(payload.delimiters) + RS + payload.urls.join(RS);
    } else if (isCaptureEntries(payload)) {
      stringifiedPayload = "M" + JSON.stringify(payload);
    } else if (isCaptureGroup(payload)) {
      stringifiedPayload = "G" + JSON.stringify(payload);
    } else if (!Array.isArray(payload)) {
      stringifiedPayload = payload;
    } else {
      stringifiedPayload = payload.join(RS);
    }
    result += key + US + stringifiedPayload + GS;
  }

  result += FS;
  return result;
}

function parse(compressed: string) {
  function parseNode(input: string, pos: number) {
    if (input[pos] !== FS) {
      throw new Error(`Expected FS at position ${pos}`);
    }
    pos++;

    const tree: AbstractTree = { [MATCH_ALL]: [] };

    while (pos < input.length && input[pos] !== FS) {
      const usPos = input.indexOf(US, pos);
      if (usPos === -1) {
        throw new Error(`Expected US after position ${pos}`);
      }
      const key = input.slice(pos, usPos);
      pos = usPos + 1;

      if (input[pos] === FS) {
        const result = parseNode(input, pos);
        tree[key] = result.tree;
        pos = result.endPos;
      } else {
        const gsPos = input.indexOf(GS, pos);
        if (gsPos === -1) {
          throw new Error(`Expected GS after position ${pos}`);
        }
        const payloadStr = input.slice(pos, gsPos);
        const payload = payloadStr === "" ? [] : payloadStr.split(RS);

        if (key === MATCH_ALL_KEY) {
          if (payloadStr.startsWith("G")) {
            tree[MATCH_ALL] = JSON.parse(payloadStr.slice(1)) as CaptureGroup;
          } else if (payloadStr.startsWith("M")) {
            tree[MATCH_ALL] = JSON.parse(payloadStr.slice(1)) as CaptureEntry[];
          } else if (payloadStr.startsWith("P")) {
            const parts = payloadStr.slice(1).split(RS);
            const delimiters = JSON.parse(parts[0]) as string[][];
            tree[MATCH_ALL] = { delimiters, urls: parts.slice(1) };
          } else {
            tree[MATCH_ALL] = payload;
          }
        } else if (key === MATCH_NONE_KEY) {
          tree[MATCH_NONE] = payload;
        } else {
          throw new Error(`Unexpected payload key: ${key}`);
        }
        pos = gsPos;
      }

      if (input[pos] === GS) pos++;
    }

    if (input[pos] !== FS) {
      throw new Error(`Expected closing FS at position ${pos}`);
    }
    pos++;

    return { tree, endPos: pos };
  }

  return parseNode(compressed, 0).tree;
}

export function insertUrlQuery(url: string, query: string) {
  // If the query is empty (after cutting out the bang) -
  // use the origin instead of the full URL template
  if (!query && url.includes("{{{s}}}")) {
    return new URL(url).origin;
  }

  // Encode query, but preserve forward slashes for paths like `t3dotgg/unduck`
  const encodedQuery = encodeURIComponent(query).replace(/%2F/g, "/");
  return url.replaceAll("{{{s}}}", encodedQuery);
}

/**
 * Resolve a multi-capture pattern against the query text.
 * Splits the query by delimiter words and substitutes positional params into URLs.
 */
function resolveMultiCapture(query: string, entry: CaptureEntry): string[] {
  const { captures } = getCaptures(query, entry);

  return entry.urls.map((url) => insertCaptures(url, captures));
}

function resolveMultiCaptures(query: string, entries: CaptureEntry[]) {
  return entries.flatMap((entry) => {
    const { captures, matched } = getCaptures(query, entry);
    return matched
      ? entry.urls.map((url) => insertCaptures(url, captures))
      : [];
  });
}

function getCaptures(query: string, entry: CaptureEntry) {
  const captures: string[] = [];
  let remaining = query.trimStart();
  let matched = true;

  for (const delimiter of entry.delimiters) {
    const delimPattern = delimiter.map((w) => escapeRegExp(w)).join("\\s+");
    const match = remaining.match(
      new RegExp(`^(.*?)\\s+${delimPattern}(?:\\s+|$)(.*)`, "s"),
    );
    if (match) {
      captures.push(match[1].trim());
      remaining = match[2];
    } else {
      captures.push(remaining.trim());
      remaining = "";
      matched = false;
      break;
    }
  }
  if (remaining) captures.push(remaining.trim());

  return { captures, matched };
}

function insertCaptures(url: string, captures: string[]) {
  let result = url;
  for (let i = 0; i < captures.length; i++) {
    const encoded = encodeURIComponent(captures[i]).replace(/%2F/g, "/");
    result = result.replaceAll(`{{{${i}}}}`, encoded);
    if (i === 0) result = result.replaceAll("{{{s}}}", encoded);
  }
  return result;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getUrlsFromRedirectTree(
  query: string,
  tree: AbstractTree,
  /** Optional fn for providing defaults before the global wildcard */
  getDefaultValue?: (query: string) => undefined | string[],
) {
  const nextWord = query.trimStart().match(/^\s*(\S+)/)?.[0];

  if (!nextWord && tree[MATCH_NONE]) {
    return tree[MATCH_NONE];
  }

  if (nextWord && tree[nextWord]) {
    return getUrlsFromRedirectTree(
      query.replace(/^\s*\S+/, ""),
      tree[nextWord],
    );
  }

  const matchAll = tree[MATCH_ALL];

  if (isCaptureEntry(matchAll)) {
    return getDefaultValue?.(query) ?? resolveMultiCapture(query, matchAll);
  }

  if (isCaptureEntries(matchAll)) {
    return getDefaultValue?.(query) ?? resolveMultiCaptures(query, matchAll);
  }

  if (isCaptureGroup(matchAll)) {
    const captureUrls = resolveMultiCaptures(query, matchAll.captures);
    return (
      getDefaultValue?.(query) ??
      (captureUrls.length > 0
        ? captureUrls
        : matchAll.urls.map((url) => insertUrlQuery(url, query.trimStart())))
    );
  }

  return (
    getDefaultValue?.(query) ??
    matchAll.map((url) => insertUrlQuery(url, query.trimStart()))
  );
}

export default class RedirectMap {
  constructor(public tree: AbstractTree) {}

  static deserialize(str: string) {
    return new RedirectMap(parse(decompress(str)));
  }

  serialize() {
    return compress(serialize(this.tree));
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
    const bang = q.match(/!(\S+)/i)?.[1]?.toLowerCase();
    if (!bang) return;

    const query = q.replace(/!\S+\s*/i, "").trim();

    if (bang in defaultBangs) {
      type Key = keyof typeof defaultBangs;
      return [insertUrlQuery(defaultBangs[bang as Key], query)];
    }
  }
}
