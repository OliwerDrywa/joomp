import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For } from "solid-js";
import { createStore } from "solid-js/store";
import { compress, decompress } from "@/lib/compression";
import {
  type RedirectData,
  deserializeCommandTree,
  redirectDataToTree,
  serializeCommandTree,
  treeToRedirectData,
  treeToDsl,
  dslToTree,
} from "@/lib/commands";

export const Route = createFileRoute("/edit")({
  component: IndexComponent,
});

function IndexComponent() {
  const params = Route.useSearch();
  return <DslEditor b={params().b} />;
  // return <RichRedirectEditor b={params().b} />;
}

function DslEditor(props: { b: string }) {
  const navigate = Route.useNavigate();

  // Parse initial tree from compressed param
  const initialDsl = createMemo(() => {
    const decompressed = decompress(props.b);
    if (!decompressed) {
      // Default example DSL
      return `# Default fallback (when no command matches)
... => [duckduckgo.com/?q={{{s}}}]

# Commands use "..." to capture remaining text
!gh ... => [github.com/search?q={{{s}}}]
!gh repo ... => [github.com/{{{s}}}]

!yt ... => [youtube.com/results?search_query={{{s}}}]

# Without "..." means exact match (no trailing text)
!yt => [youtube.com]
`;
    }
    try {
      const tree = deserializeCommandTree(decompressed);
      return treeToDsl(tree);
    } catch {
      return "# Error parsing existing data\n... => [duckduckgo.com/?q={{{s}}}]\n";
    }
  });

  const [dsl, setDsl] = createSignal(initialDsl());
  const [error, setError] = createSignal<string | null>(null);

  // Update dsl when props.b changes
  createEffect(() => {
    setDsl(initialDsl());
  });

  // Validate and compute compressed output
  const compressedBangs = createMemo(() => {
    try {
      const tree = dslToTree(dsl());
      setError(null);
      const serialized = serializeCommandTree(tree);
      return compress(serialized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid syntax");
      return props.b; // Return original on error
    }
  });

  const hasChanges = createMemo(
    () => compressedBangs() !== props.b && !error(),
  );

  return (
    <>
      <UrlPreview url={"/x?q=%s&b=" + compressedBangs()} />

      <form
        class="flex flex-col gap-4 border border-neutral-400 p-4"
        onsubmit={(e) => {
          e.preventDefault();
          if (error()) return;

          navigate({
            to: "/edit",
            search: { b: compressedBangs() },
          });
        }}
      >
        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-500">
            Command definitions (<code>!cmd ...</code> = with text,{" "}
            <code>!cmd</code> = exact match)
          </label>
          <textarea
            class="h-96 w-full resize-y border p-3 font-mono text-sm text-nowrap dark:border-neutral-400 dark:bg-neutral-900"
            value={dsl()}
            onInput={(e) => setDsl(e.currentTarget.value)}
            spellcheck={false}
          />
          {error() && <div class="text-sm text-red-500">Error: {error()}</div>}
        </div>

        <fieldset class="flex flex-row gap-2">
          <button
            type="button"
            class="ms-auto cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={!hasChanges()}
            onClick={() => setDsl(initialDsl())}
          >
            Undo
          </button>

          <button
            type="submit"
            class="cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={!hasChanges()}
          >
            Save to URL
          </button>
        </fieldset>
      </form>
    </>
  );
}

function UrlPreview(props: { url: string }) {
  return (
    <div class="flex w-full border border-blue-500">
      <div class="overflow-scroll px-4 py-3 text-lg whitespace-nowrap">
        <span class="text-neutral-500">{location.origin}</span>
        <span>{props.url}</span>
      </div>

      <button
        class="grid aspect-square place-content-center bg-blue-500"
        onClick={async (e) => {
          const img = e.currentTarget.firstChild;
          if (!img || !("src" in img)) throw new Error("<img/> not found");

          await navigator.clipboard.writeText(location.origin + props.url);

          img.src = "/clipboard-check.svg";
          setTimeout(() => (img.src = "/clipboard.svg"), 2000);
        }}
      >
        <img
          class="h-6 w-6"
          id="clipboard-icon"
          src="/clipboard.svg"
          alt="Copy search URL to clipboard"
        />
      </button>
    </div>
  );
}

function parseRedirects(b: string): RedirectData[] {
  const decompressed = decompress(b);
  if (!decompressed) return [];
  try {
    const tree = deserializeCommandTree(decompressed);
    return treeToRedirectData(tree);
  } catch {
    return [];
  }
}

function serializeRedirects(rows: RedirectData[]): string {
  const tree = redirectDataToTree(rows);
  return serializeCommandTree(tree);
}

/** @deprecated Use YamlEditor instead - kept for reference */
export function RichRedirectEditor(props: { b: string }) {
  const navigate = Route.useNavigate();

  const redirects = parseRedirects(props.b);

  const [rows, setRows] = createStore([...redirects, { bangs: [], urls: [] }]);
  createEffect(() => setRows([...redirects, { bangs: [], urls: [] }])); // update editor if `props.redirects` changes

  const [focus, setFocus] = createSignal<number>();
  const [search, setSearch] = createSignal("");

  function focusCell(i: number, start?: number | null, end?: number | null) {
    const inputCount = filteredRows().length * 2;
    const input = document.getElementById(
      String((inputCount + i) % inputCount),
    ) as HTMLInputElement | null;
    if (!input) return;

    input.focus();
    input.setSelectionRange(
      start ?? input.value.length,
      end ?? input.value.length,
    );
  }

  const handleKeyNavigation = (i: number) => (e: KeyboardEvent) => {
    const input = e.currentTarget as HTMLInputElement;

    switch (e.key) {
      case "ArrowUp":
        {
          if (i <= 1) break;
          e.preventDefault();

          focusCell(i - 2, input.selectionStart, input.selectionEnd);
        }
        break;

      case "ArrowDown":
        {
          const inputCount = filteredRows().length * 2;
          if (i >= inputCount - 2) break;
          e.preventDefault();

          focusCell(i + 2, input.selectionStart, input.selectionEnd);
        }
        break;

      case "Home":
      case "ArrowLeft":
        {
          if (i <= 0) break;
          if (input.selectionEnd !== 0) break;
          e.preventDefault();

          focusCell(i - 1);
        }
        break;

      case "End":
      case "ArrowRight":
        {
          if (i >= filteredRows().length * 2 - 1) break;
          if (input.selectionStart !== input.value.length) break;
          e.preventDefault();

          focusCell(i + 1, 0, 0);
        }
        break;

      case "PageUp":
        {
          if (i <= 1) break;
          e.preventDefault();

          focusCell(i % 2, input.selectionStart, input.selectionStart);
        }
        break;

      case "PageDown":
        {
          const inputCount = filteredRows().length * 2;
          if (i >= inputCount - 1) break;
          e.preventDefault();

          focusCell(-2 + (i % 2), input.selectionEnd, input.selectionEnd);
        }
        break;
    }
  };

  // TODO - maybe implement a better fuzzy search or use a library
  const filteredRows = createMemo(() =>
    rows
      .map((row, i) => [i, row] as const)
      .filter(([, row]) => {
        const s = search().toLowerCase();
        if (!s) return true; // return all rows if we're not searching

        for (const term of [...row.bangs, ...row.urls]) {
          let searchIndex = 0;

          const t = term.toLowerCase();

          for (let i = 0; i < t.length && searchIndex < s.length; i++) {
            if (t[i] === s[searchIndex]) searchIndex++;
          }

          if (searchIndex === s.length) return true;
        }

        return false;
      }),
  );

  createEffect(() => {
    for (let i = 0; i < rows.length - 1; i++) {
      if (
        rows[i].bangs.length === 0 &&
        rows[i].urls.length === 0 &&
        focus() !== i
      ) {
        setRows([...rows.slice(0, i), ...rows.slice(i + 1)]);
        i--;
      }
    }
  });

  createEffect(() => {
    const lastRow = rows.at(-1);
    if (!lastRow) return;
    if (lastRow.bangs.length > 0 || lastRow.urls.length > 0) {
      setRows(rows.length, { bangs: [], urls: [] });
    }
  });

  const compressedBangs = createMemo(() => {
    const str = serializeRedirects(rows);
    return compress(str);
  });

  return (
    <>
      <UrlPreview url={"/x?q=%s&b=" + compressedBangs()} />

      <form
        class="flex flex-col gap-8 border border-neutral-400 p-4"
        onsubmit={(e) => {
          e.preventDefault();

          navigate({
            to: "/edit",
            search: { b: compressedBangs() },
          });
        }}
      >
        <fieldset class="flex-1 overflow-scroll border-y-1 p-2 pb-8 dark:border-neutral-400">
          <legend class="flex max-w-[100dvw] flex-row justify-between gap-4">
            <input
              class="border p-2 dark:border-neutral-400"
              type="search"
              placeholder="Find bang or URL"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value.trim())}
            />

            <select
              class="border p-2 dark:bg-neutral-900"
              onChange={(e) => {
                // set local rows to the value in the option
                console.log(e.currentTarget.value);
              }}
            >
              <option value="" disabled selected>
                Custom
              </option>
              <option value={1}>Option 1</option>
              <option value={["a", "b"]}>Option 2</option>
              <option value="option3">Option 3</option>
            </select>
          </legend>

          <For each={filteredRows()}>
            {([i, row]) => (
              <span class="flex px-2">
                <input
                  id={String(i * 2)}
                  class="w-0 max-w-32 flex-1"
                  type="text"
                  // comma separated list of bangs
                  placeholder="bangs"
                  value={row.bangs.join(", ")}
                  onFocus={() => setFocus(i)}
                  onBlur={() => setFocus((f) => (f === i ? undefined : f))}
                  onKeyDown={handleKeyNavigation(i * 2)}
                  onChange={(e) => {
                    const newBangs = e.currentTarget.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);

                    setRows(i, "bangs", newBangs);
                  }}
                />
                <label class="flex w-0 flex-3 dark:text-neutral-500">
                  <span class="px-2 dark:text-neutral-200">➜</span>
                  <span class="hidden sm:block">https://</span>
                  <input
                    id={String(i * 2 + 1)}
                    class="w-0 flex-1 dark:text-neutral-200"
                    type="text"
                    // Multiple URLs separated by " | " (use `{{{s}}}` for search queries)
                    placeholder="url1 | url2 | url3"
                    value={row.urls.join(" | ")}
                    onFocus={() => setFocus(i)}
                    onBlur={() => setFocus((f) => (f === i ? undefined : f))}
                    onKeyDown={handleKeyNavigation(i * 2 + 1)}
                    onChange={(e) => {
                      const newUrls = e.currentTarget.value
                        .split("|")
                        .map((u) => u.trim())
                        .filter(Boolean);

                      const currentUrls = row.urls.join(" | ");
                      const newUrlsStr = newUrls.join(" | ");

                      if (currentUrls === newUrlsStr) {
                        // Normalize the input display
                        e.currentTarget.value = newUrlsStr;
                        return;
                      }

                      setRows(i, "urls", newUrls);
                    }}
                  />
                </label>
              </span>
            )}
          </For>
        </fieldset>

        <fieldset class="flex flex-row gap-2">
          <button
            class="ms-auto cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={compress(serializeRedirects(rows)) === props.b}
            onClick={() => {
              setRows([...redirects, { bangs: [], urls: [] }]);
            }}
          >
            Undo
          </button>

          <button
            type="submit"
            class="cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={compress(serializeRedirects(rows)) === props.b}
          >
            Save to URL
          </button>
        </fieldset>
      </form>
    </>
  );
}
