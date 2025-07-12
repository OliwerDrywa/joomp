import { createFileRoute, Link } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For } from "solid-js";
import { createStore } from "solid-js/store";
import { compress, decompress } from "@/lib/compression";
import { stringify, parse, type RedirectData } from "@/lib/parsing";

export const Route = createFileRoute("/edit")({
  component: IndexComponent,
});

function IndexComponent() {
  const params = Route.useSearch();

  return <RichRedirectEditor redirects={parse(decompress(params().via))} />;
}

function Examples() {
  return (
    <nav class="flex w-full justify-center gap-4">
      <Link to="/edit" search={{ via: compress(stringify([])) }}>
        clear
      </Link>

      <Link
        to="/edit"
        search={{
          via: compress(
            stringify([
              {
                triggers: ["ddg"],
                url: "duckduckgo.com/?q={{{s}}}",
              },
              {
                triggers: ["g", "google"],
                url: "google.com/search?q={{{s}}}",
              },
              {
                triggers: ["t3"],
                url: "t3.chat/new?q={{{s}}}",
              },
              {
                triggers: ["gh"],
                url: "github.com/search?q={{{s}}}",
              },
              {
                triggers: ["yt"],
                url: "youtube.com/results?search_query={{{s}}}",
              },
              {
                triggers: ["wiki"],
                url: "wikipedia.org/wiki/Special:Search?search={{{s}}}",
              },
              {
                triggers: ["w"],
                url: "duckduckgo.com/?q=weather+{{{s}}}",
              },
              {
                triggers: ["r/"],
                url: "reddit.com/r/{{{s}}}",
              },
            ]),
          ),
        }}
      >
        default
      </Link>
    </nav>
  );
}

function UrlPreview(props: { url: string }) {
  async function copyToClipboard() {
    const img = document.getElementById("clipboard-icon");
    if (!img || !("src" in img)) return;

    await navigator.clipboard.writeText(props.url);

    img.src = "/clipboard-check.svg";
    setTimeout(() => (img.src = "/clipboard.svg"), 2000);
  }

  return (
    <div class="flex w-full overflow-hidden rounded-lg border border-blue-500">
      <input
        class="flex-1 py-2 pr-3 pl-4"
        type="text"
        value={props.url}
        readOnly
      />

      <button class="bg-blue-500 px-3 py-2" onClick={copyToClipboard}>
        <img
          id="clipboard-icon"
          src="/clipboard.svg"
          alt="Copy search URL to clipboard"
        />
      </button>
    </div>
  );
}

enum Compression {
  None,
  LZString,
  Pako,
}
class Enum {
  static keys(e: Record<any, any>) {
    const ks = Object.keys(e);
    return ks.slice(ks.length / 2, ks.length) as (keyof typeof Compression)[];
  }
  static values(e: Record<any, any>): number[] {
    const vs = Object.values(e);
    return vs.slice(vs.length / 2, vs.length);
  }
}

function RichRedirectEditor(props: { redirects: RedirectData[] }) {
  const navigate = Route.useNavigate();

  const [rows, setRows] = createStore<RedirectData[]>([
    ...props.redirects,
    { triggers: [], url: "" },
  ]);

  // update editor `props.redirects` changes
  createEffect(() => setRows([...props.redirects, { triggers: [], url: "" }]));

  const [focus, setFocus] = createSignal<number>();
  const [search, setSearch] = createSignal("");
  const [compression, setCompression] = createSignal(Compression.Pako);

  // TODO - implement a bettwe fuzzy search or use a library
  const filteredRows = createMemo(() =>
    rows.filter((row: RedirectData) => {
      const s = search().toLowerCase();
      if (!s) return true; // return all rows if we're not searching

      for (const term of [...row.triggers, row.url]) {
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
      if (rows[i].triggers.length === 0 && !rows[i].url && focus() !== i) {
        setRows(rows.slice(0, i).concat(rows.slice(i + 1)));
        i--;
      }
    }
  });

  createEffect(() => {
    const lastRow = rows.at(-1);
    if (!lastRow) return;
    if (lastRow.triggers.length > 0 || lastRow.url) {
      setRows(rows.length, { triggers: [], url: "" });
    }
  });

  return (
    <>
      <fieldset class="flex-1 overflow-scroll border p-2 dark:border-gray-400">
        <legend class="flex max-w-[100dvw] flex-row justify-between gap-4">
          <input
            class="border p-2 dark:border-gray-400"
            type="search"
            placeholder="Find bang or URL"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value.trim())}
          />

          <label class="flex cursor-not-allowed items-center gap-3 border p-2 dark:border-gray-400">
            <span>Compression:</span>
            <select
              disabled
              name="compression"
              class="bg-gray-200 dark:bg-neutral-900 dark:text-gray-400"
            >
              <For each={Enum.keys(Compression)}>
                {(c) => (
                  <option
                    value={c}
                    selected={compression() === Compression[c]}
                    // onChange={() => setCompression(Compression[c])}
                  >
                    {c}
                  </option>
                )}
              </For>
            </select>
          </label>

          <button
            class="cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-gray-400"
            disabled={stringify(rows) === stringify(props.redirects)}
            onClick={() => {
              setRows([...props.redirects, { triggers: [], url: "" }]);
            }}
          >
            Undo
          </button>

          <button
            class="cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-gray-400"
            disabled={stringify(rows) === stringify(props.redirects)}
            onClick={() => {
              navigate({
                to: "/edit",
                search: { via: compress(stringify(rows)) },
              });
            }}
          >
            Save to URL
          </button>
        </legend>

        <For each={filteredRows()}>
          {(row, i) => (
            <span class="flex px-2">
              <input
                class="w-0 max-w-32 flex-1"
                type="text"
                // comma separated list of triggers
                placeholder="triggers"
                value={row.triggers.join(", ")}
                onFocus={() => setFocus(i())}
                onBlur={() => setFocus((f) => (f === i() ? undefined : f))}
                onChange={(e) => {
                  const newTriggers = e.currentTarget.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);

                  setRows(i(), "triggers", newTriggers);
                }}
              />
              <label class="flex w-0 flex-3 dark:text-gray-500">
                <span class="px-2 dark:text-gray-200">➜</span>
                <span class="hidden sm:block">https://</span>
                <input
                  class="w-0 flex-1 dark:text-gray-200"
                  type="text"
                  // (use `{{{s}}}` as placeholder for search queries)
                  placeholder="domain.com/?={{{s}}}"
                  value={row.url}
                  onFocus={() => setFocus(i())}
                  onBlur={() => setFocus((f) => (f === i() ? undefined : f))}
                  onChange={(e) => {
                    const newUrl = e.currentTarget.value.trim();

                    if (row.url === newUrl) {
                      // we have to trim the input manually here
                      // because setRows will not trigger a re-render
                      // if the string is the same before and after
                      e.currentTarget.value = newUrl;
                      return;
                    }

                    setRows(i(), "url", newUrl);
                  }}
                />
              </label>
            </span>
          )}
        </For>
      </fieldset>

      <UrlPreview
        url={location.origin + "/go?to=%s&via=" + compress(stringify(rows))}
      />
    </>
  );
}
