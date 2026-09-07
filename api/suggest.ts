import RedirectMap from "../src/lib/redirectTree.js";
import bangs from "../src/lib/bangs.min.json";

type RequestLike = { headers?: Record<string, string | string[] | undefined>; url?: string };
type ResponseLike = {
  end: (body: string) => void;
  setHeader: (name: string, value: string) => void;
};

const MAX_QUERY_LENGTH = 512;
const MAX_CONFIG_LENGTH = 8_192;
const MAX_DECODED_CONFIG_LENGTH = 64_000;
const bangKeys = Object.keys(bangs);

function patternsOf(b: string): string[][] {
  if (b.length > MAX_CONFIG_LENGTH) return [];
  const seen = new Set<string>();
  for (const line of RedirectMap.deserialize(b, MAX_DECODED_CONFIG_LENGTH).toDSL().split("\n")) {
    const left = line.split(" => ")[0].trim();
    if (left && left !== "...") seen.add(left);
  }
  return [...seen].map((pattern) => pattern.split(/\s+/));
}

function isPrefix(word: string, literal: string, isFinal: boolean) {
  return isFinal ? literal.startsWith(word) : literal === word;
}

/**
 * Returns a selectable query that retains the typed capture values and adds the
 * next literal portion of a DSL rule. Captures consume words only until the
 * next literal delimiter can be recognized, so traversal continues after `...`.
 */
function completePattern(query: string, pattern: string[]): string | undefined {
  const hasTrailingSpace = /\s$/.test(query);
  const typed = query.trim().split(/\s+/).filter(Boolean);
  if (!typed.length) return;

  const output: string[] = [];
  let typedIndex = 0;
  let patternIndex = 0;
  while (patternIndex < pattern.length) {
    const token = pattern[patternIndex];
    if (token !== "...") {
      const word = typed[typedIndex];
      const nextCapture = pattern.indexOf("...", patternIndex);
      const literals = pattern.slice(patternIndex, nextCapture === -1 ? pattern.length : nextCapture);
      if (!word) return `${output.concat(literals).join(" ")} `;
      const isFinal = typedIndex === typed.length - 1 && !hasTrailingSpace;
      if (!isPrefix(word, token, isFinal)) return;
      output.push(isFinal ? token : word);
      typedIndex++;
      patternIndex++;
      continue;
    }

    const nextCapture = pattern.indexOf("...", patternIndex + 1);
    const delimiter = pattern.slice(patternIndex + 1, nextCapture === -1 ? pattern.length : nextCapture);
    if (!delimiter.length) return `${output.concat(typed.slice(typedIndex)).join(" ")} `;

    let matchedDelimiter = false;
    for (let start = typedIndex; start < typed.length; start++) {
      const matchingWords = Math.min(typed.length - start, delimiter.length);
      const isPartialDelimiter = delimiter.slice(0, matchingWords).every((literal, offset) =>
        isPrefix(
          typed[start + offset],
          literal,
          start + offset === typed.length - 1 && !hasTrailingSpace,
        ),
      );
      if (!isPartialDelimiter) continue;
      output.push(...typed.slice(typedIndex, start));
      if (matchingWords < delimiter.length || (!hasTrailingSpace && typed.length - start === delimiter.length)) {
        output.push(...delimiter);
        return `${output.join(" ")} `;
      }
      output.push(...delimiter);
      typedIndex = start + delimiter.length;
      patternIndex += delimiter.length + 1;
      matchedDelimiter = true;
      break;
    }
    if (!matchedDelimiter) {
      if (typedIndex === typed.length) return;
      return `${output.concat(typed.slice(typedIndex), delimiter).join(" ")} `;
    }
  }

  return `${output.concat(typed.slice(typedIndex)).join(" ")} `;
}

export function suggest(query: string, b?: string, limit = 8): string[] {
  const safeQuery = query.slice(0, MAX_QUERY_LENGTH);
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    if (!seen.has(value) && out.length < limit) {
      seen.add(value);
      out.push(value);
    }
  };

  if (b) {
    try {
      for (const pattern of patternsOf(b)) {
        const completion = completePattern(safeQuery, pattern);
        if (completion) add(completion);
      }
    } catch {
      // An invalid personalized config must not prevent standard bang completions.
    }
  }

  const bang = safeQuery.match(/!([a-z0-9]+)$/i);
  if (bang) {
    const fragment = bang[1].toLowerCase();
    const head = safeQuery.slice(0, bang.index);
    for (const key of bangKeys
      .filter((key) => key.startsWith(fragment))
      .sort((left, right) => left.length - right.length || left.localeCompare(right))) {
      add(`${head}!${key} `);
    }
  }

  return out;
}

function requestUrl(req: RequestLike) {
  const protocol = String(req.headers?.["x-forwarded-proto"] ?? "https").split(",")[0];
  const host = String(req.headers?.host ?? "localhost");
  return new URL(req.url ?? "/api/suggest", `${protocol}://${host}`);
}

export default function handler(req: RequestLike, res: ResponseLike) {
  const url = requestUrl(req);
  const query = (url.searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const config = url.searchParams.get("b") ?? undefined;
  res.setHeader("content-type", "application/x-suggestions+json; charset=utf-8");
  res.setHeader("cache-control", "private, no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify([query, suggest(query, config)]));
}
