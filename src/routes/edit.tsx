import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For } from "solid-js";
import { createStore } from "solid-js/store";
import { compress, decompress } from "@/lib/compression";
import { stringify, parse, type RedirectData } from "@/lib/parsing";

export const Route = createFileRoute("/edit")({
  component: IndexComponent,
});

function IndexComponent() {
  const params = Route.useSearch();
  return <RichRedirectEditor b={params().b} />;
}

// function Examples() {
//   return (
//     <nav class="flex w-full justify-center gap-4">
//       <Link
//         to="/edit"
//         search={{ via: compress(stringify([]), Compression.LZString) }}
//       >
//         clear
//       </Link>

//       <Link
//         to="/edit"
//         search={{
//           via: compress(
//             stringify([
//               {
//                 bangs: ["ddg"],
//                 url: "duckduckgo.com/?q={{{s}}}",
//               },
//               {
//                 bangs: ["g", "google"],
//                 url: "google.com/search?q={{{s}}}",
//               },
//               {
//                 bangs: ["t3"],
//                 url: "t3.chat/new?q={{{s}}}",
//               },
//               {
//                 bangs: ["gh"],
//                 url: "github.com/search?q={{{s}}}",
//               },
//               {
//                 bangs: ["yt"],
//                 url: "youtube.com/results?search_query={{{s}}}",
//               },
//               {
//                 bangs: ["wiki"],
//                 url: "wikipedia.org/wiki/Special:Search?search={{{s}}}",
//               },
//               {
//                 bangs: ["w"],
//                 url: "duckduckgo.com/?q=weather+{{{s}}}",
//               },
//               {
//                 bangs: ["r/"],
//                 url: "reddit.com/r/{{{s}}}",
//               },
//             ]),
//             Compression.LZString,
//           ),
//         }}
//       >
//         default
//       </Link>
//     </nav>
//   );
// }

function UrlPreview(props: { url: string }) {
  async function copyToClipboard() {
    const img = document.getElementById("clipboard-icon");
    if (!img || !("src" in img)) return;

    await navigator.clipboard.writeText(location.origin + props.url);

    img.src = "/clipboard-check.svg";
    setTimeout(() => (img.src = "/clipboard.svg"), 2000);
  }

  return (
    <div class="flex w-full rounded-lg border border-blue-500">
      <div class="overflow-scroll px-4 py-3 text-lg whitespace-nowrap">
        <span class="text-neutral-500">{location.origin}</span>
        <span>{props.url}</span>
      </div>

      <button
        class="grid aspect-square place-content-center bg-blue-500"
        onClick={copyToClipboard}
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

function RichRedirectEditor(props: { b: string }) {
  const navigate = Route.useNavigate();

  const bangs = decompress(props.b);
  const redirects = parse(bangs);

  const [rows, setRows] = createStore([...redirects, { bangs: [], url: "" }]);
  // update editor `props.redirects` changes
  createEffect(() => setRows([...redirects, { bangs: [], url: "" }]));

  const [focus, setFocus] = createSignal<number>();
  const [search, setSearch] = createSignal("");
  // const [compression, setCompressionMethod] = createSignal(initialCompression);

  // TODO - implement a bettwe fuzzy search or use a library
  const filteredRows = createMemo(() =>
    rows.filter((row: RedirectData) => {
      const s = search().toLowerCase();
      if (!s) return true; // return all rows if we're not searching

      for (const term of [...row.bangs, row.url]) {
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
      if (rows[i].bangs.length === 0 && !rows[i].url && focus() !== i) {
        setRows(rows.slice(0, i).concat(rows.slice(i + 1)));
        i--;
      }
    }
  });

  createEffect(() => {
    const lastRow = rows.at(-1);
    if (!lastRow) return;
    if (lastRow.bangs.length > 0 || lastRow.url) {
      setRows(rows.length, { bangs: [], url: "" });
    }
  });

  const compressedBangs = createMemo(() => {
    const str = stringify(rows);
    return compress(str);
  });

  return (
    <>
      <UrlPreview url={"/x?q=%s&b=" + compressedBangs()} />

      <hr class="my-4 border-neutral-400" />

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
        <fieldset class="flex-1 overflow-scroll border-t-1 p-2 dark:border-neutral-400">
          <legend class="flex max-w-[100dvw] flex-row justify-between gap-4">
            <input
              class="border p-2 dark:border-neutral-400"
              type="search"
              placeholder="Find bang or URL"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value.trim())}
            />
          </legend>

          <For each={filteredRows()}>
            {(row, i) => (
              <span class="flex px-2">
                <input
                  class="w-0 max-w-32 flex-1"
                  type="text"
                  // comma separated list of bangs
                  placeholder="bangs"
                  value={row.bangs.join(", ")}
                  onFocus={() => setFocus(i())}
                  onBlur={() => setFocus((f) => (f === i() ? undefined : f))}
                  onChange={(e) => {
                    const newBangs = e.currentTarget.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);

                    setRows(i(), "bangs", newBangs);
                  }}
                />
                <label class="flex w-0 flex-3 dark:text-neutral-500">
                  <span class="px-2 dark:text-neutral-200">➜</span>
                  <span class="hidden sm:block">https://</span>
                  <input
                    class="w-0 flex-1 dark:text-neutral-200"
                    type="text"
                    // (use `{{{s}}}` as placeholder for search queries)
                    placeholder="domain.com/?q={{{s}}}"
                    value={row.url}
                    onFocus={() => setFocus(i())}
                    onBlur={() => setFocus((f) => (f === i() ? undefined : f))}
                    onChange={(e) => {
                      const newUrl = e.currentTarget.value.trim();

                      if (row.url === newUrl) {
                        // we have to trim the input manually here
                        // because setRows will not bang a re-render
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

        <hr class="border-neutral-400" />

        {/* <details>
          <summary class="cursor-pointer text-xl font-semibold">
            Compression settings
          </summary>

          <div class="flex flex-col gap-4 px-2 py-4">
            <For
              each={
                [
                  [
                    Compression.LZString,
                    "LZString",
                    "Compresses the URL using LZString; reduces URL length significantly at a minor cost in performance.",
                  ],
                ] as const
              }
            >
              {([id, name, desc]) => (
                <label class="">
                  <input
                    type="radio"
                    class="cursor-pointer"
                    name="compression"
                    checked={compression() === id}
                    onChange={() => {
                      setCompressionMethod(id);
                    }}
                  />
                  <h2 class="inline px-2 text-lg">
                    {name} ({compressedBangs()[id].length} char
                    {compressedBangs()[id].length !== 1 && "s"})
                  </h2>
                  <p class="text-base dark:text-neutral-300">{desc}</p>
                </label>
              )}
            </For>
          </div>
        </details> */}

        <fieldset class="flex flex-row gap-2">
          <button
            class="ms-auto cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={compress(stringify(rows)) === props.b}
            onClick={() => {
              setRows([...redirects, { bangs: [], url: "" }]);
            }}
          >
            Undo
          </button>

          <button
            type="submit"
            class="cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={compress(stringify(rows)) === props.b}
          >
            Save to URL
          </button>
        </fieldset>
      </form>
    </>
  );
}
