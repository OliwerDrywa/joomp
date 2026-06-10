# joomp

A fast, client-side DuckDuckGo `!bang` redirect engine. All redirects happen locally in the browser -- no server round-trips.

Fork of [und*ck](https://github.com/T3-Content/unduck), but instead of shipping DuckDuckGo's entire bang list, you define your own shortcuts using a simple DSL. Your config is compressed and stored entirely in the URL.

## Setup

1. Visit [joomp.link/edit](https://joomp.link/edit) to customize your redirect rules
2. Copy the generated URL (it looks like `https://joomp.link/x?q=%s&b=<compressed-config>`)
3. Paste it as a **custom search engine** in your browser settings
   - Chrome: Settings > Search engine > Manage search engines > Add
   - Firefox: [instructions](https://support.mozilla.org/en-US/kb/add-or-remove-search-engine-firefox)
   - Arc/Brave/Edge: Similar to Chrome

`%s` is the browser's placeholder -- it gets replaced with whatever you type in the address bar.

## DSL Syntax

### Basic redirects

```
# Wildcard: captures remaining text into {{{s}}}
!gh ... => https://github.com/search?q={{{s}}}

# Exact match: no trailing text
!gh => https://github.com

# Global fallback: matches anything without a recognized command
... => https://duckduckgo.com/?q={{{s}}}
```

### Subcommands

Commands can have sub-levels for more specific behavior:

```
!o => obsidian://daily
!o search ... => obsidian://search?query={{{s}}}
!o ... => obsidian://quickadd?choice=journal&value={{{s}}}
```

- `!o` (no args) opens Obsidian daily note
- `!o search project ideas` searches Obsidian
- `!o had a great day` falls through to the journal entry

### Multiple URLs

Open multiple tabs at once by providing a JSON array:

```
!steam ... => ["obsidian://quickadd?choice=gaming%20log", "steam://open/bigpicture"]
```

### Comments

Lines starting with `#` are ignored:

```
# This is a comment
!gh ... => https://github.com/search?q={{{s}}}
```

## Multi-Param Search

Capture multiple values from a single query using positional `...` tokens separated by delimiter words.

### Syntax

```
!command prefix ... delimiter ... => https://example.com/?a={{{0}}}&b={{{1}}}
```

- Each `...` is a positional capture group
- Literal words between `...` tokens act as **delimiters** that split the input
- Captures are referenced by index: `{{{0}}}`, `{{{1}}}`, `{{{2}}}`, etc.
- `{{{s}}}` is an alias for `{{{0}}}` (backwards compatible)

### Examples

**Flight search with 3 params:**

```
!flight from ... to ... on ... => https://flights.com/?from={{{0}}}&to={{{1}}}&date={{{2}}}
```

| Query | Result |
|-------|--------|
| `!flight from new york to los angeles on 2025-06-15` | `https://flights.com/?from=new%20york&to=los%20angeles&date=2025-06-15` |

**Lookup with reordered params:**

```
!query place ... name ... => https://querysite.com/?name={{{1}}}&place={{{0}}}
```

| Query | Result |
|-------|--------|
| `!query place tokyo name john` | `https://querysite.com/?name=john&place=tokyo` |
| `!query place new york city name john doe` | `https://querysite.com/?name=john%20doe&place=new%20york%20city` |

**Scoped search:**

```
!search in ... for ... => https://example.com/search?scope={{{0}}}&q={{{1}}}
```

| Query | Result |
|-------|--------|
| `!search in docs for setup guide` | `https://example.com/search?scope=docs&q=setup%20guide` |

### How it works

The delimiter words are matched left-to-right in the query text. Everything between delimiters becomes a capture. Multi-word values are supported -- the engine finds the delimiter words and splits around them.

If a delimiter isn't found, everything remaining is captured into the current position.

## DuckDuckGo Bang Fallback

If a `!bang` isn't defined in your custom config, joomp falls back to DuckDuckGo's full database of 8,000+ bangs. So `!wiki`, `!yt`, `!so` etc. all work out of the box even without explicit rules.

## Development

```sh
bun install
bun run dev
```

### Tests

```sh
bun test
```

## How is it faster?

DuckDuckGo does bang redirects server-side, which involves DNS lookups and network round-trips. joomp does all the work client-side -- once the JS is cached, redirects are instant.
