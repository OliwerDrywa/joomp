import RedirectMap from "../src/lib/redirectTree";
import bangs from "../src/lib/bangs.min.json";

const bangKeys = Object.keys(bangs);

/** The command patterns a config defines, e.g. "!o search ..." (left of =>). */
function patternsOf(b: string): string[] {
  const seen = new Set<string>();
  for (const line of RedirectMap.deserialize(b).toDSL().split("\n")) {
    const left = line.split(" => ")[0].trim();
    // Skip the bare global wildcard "..." (matches everything, suggests nothing)
    if (left && left !== "...") seen.add(left);
  }
  return [...seen];
}

/**
 * Is `typed` a prefix of `pattern` word-by-word? A pattern word of "..." is a
 * capture slot that swallows the rest of the typed input (and onward). The
 * final typed word matches by prefix (still being typed); earlier words must
 * match in full so "!o se" doesn't wrongly match "!o search" after the space.
 */
function matchesPrefix(typed: string[], pattern: string[]): boolean {
  for (let i = 0; i < typed.length; i++) {
    const p = pattern[i];
    if (p === undefined) return false; // typed more words than pattern has
    if (p === "...") return true; // capture slot: rest is free text
    const last = i === typed.length - 1;
    if (last ? !p.startsWith(typed[i]) : p !== typed[i]) return false;
  }
  return true;
}

/**
 * Config-aware suggestions. Given the omnibox query and the user's compressed
 * config `b`, suggest:
 *  1. configured command patterns whose words match what's typed so far
 *     (covers multi-word + multi-capture patterns like "!o search ..."), and
 *  2. bang completions for a trailing `!token` (the DDG bang fallback set).
 *
 * Stateless: `b` is decompressed per request, nothing is stored.
 */
export function suggest(query: string, b?: string, limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    if (!seen.has(s) && out.length < limit) (seen.add(s), out.push(s));
  };

  const typedWords = query.trim() ? query.trim().split(/\s+/) : [];

  // 1. Config patterns whose words the typed query is a prefix of.
  if (b) {
    let patterns: string[] = [];
    try {
      patterns = patternsOf(b);
    } catch {
      /* bad/garbled b -> fall through to bangs */
    }
    for (const pattern of patterns) {
      if (matchesPrefix(typedWords, pattern.split(/\s+/)))
        add(pattern.replace(/\.\.\./g, "…") + " ");
    }
  }

  // 2. Bang completion for a trailing !token.
  const m = query.match(/!([a-z0-9]+)$/i);
  if (m) {
    const frag = m[1].toLowerCase();
    const head = query.slice(0, m.index);
    for (const k of bangKeys
      .filter((k) => k.startsWith(frag))
      .sort((a, c) => a.length - c.length || (a < c ? -1 : 1)))
      add(`${head}!${k} `);
  }

  return out.slice(0, limit);
}

// OpenSearch Suggestions format: [query, [completions]]
export default function handler(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const b = url.searchParams.get("b") ?? undefined;
  const body = JSON.stringify([q, suggest(q, b)]);
  return new Response(body, {
    headers: {
      "content-type": "application/x-suggestions+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
