import { createFileRoute, Link } from "@tanstack/solid-router";
import { createEffect, createSignal, For } from "solid-js";
import { createStore } from "solid-js/store";
import { compress, decompress } from "@/lib/compression";
import { stringify, parse, type RedirectData } from "@/lib/parsing";

export const Route = createFileRoute("/edit")({
  component: IndexComponent,
});

function IndexComponent() {
  const params = Route.useSearch();

  return (
    <>
      <RedirectEditor via={params().via} />
      <Examples />
      <UrlPreview
        url={window.location.origin + "/go?to=%s&via=" + params().via}
      />
    </>
  );
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

function RedirectEditor(props: { via: string }) {
  const [focus, setFocus] = createSignal(0);
  const [rows, setRows] = createStore<RedirectData[]>([
    { triggers: [], url: "" },
  ]);

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

  createEffect(() => {
    // update editor when `?via=...` changes
    setRows([...parse(decompress(props.via)), { triggers: [], url: "" }]);
  });

  // TODO
  // - onInput create a new row if the last row is not empty
  //
  // - add validation for duplicate triggers and URLs
  // - prettify
  //
  // - different types of compression??
  // - url length preview

  // // Helper function to check for duplicate triggers
  // const getDuplicateTriggers = () => {
  //   const triggerCounts = new Map<string, number[]>();

  //   rows.forEach((row, rowIndex) => {
  //     row.triggers.forEach((trigger) => {
  //       if (trigger) {
  //         if (!triggerCounts.has(trigger)) {
  //           triggerCounts.set(trigger, []);
  //         }
  //         triggerCounts.get(trigger)!.push(rowIndex);
  //       }
  //     });
  //   });

  //   return triggerCounts;
  // };

  // // Helper function to check for duplicate URLs
  // const getDuplicateUrls = () => {
  //   const urlCounts = new Map<string, number[]>();

  //   rows.forEach((row, rowIndex) => {
  //     if (row.url) {
  //       if (!urlCounts.has(row.url)) {
  //         urlCounts.set(row.url, []);
  //       }
  //       urlCounts.get(row.url)!.push(rowIndex);
  //     }
  //   });

  //   const duplicates = new Set<number>();
  //   urlCounts.forEach((rowIndices) => {
  //     if (rowIndices.length > 1) {
  //       rowIndices.forEach((index) => duplicates.add(index));
  //     }
  //   });

  //   return duplicates;
  // };

  // const duplicateTriggerRows = getDuplicateTriggers();
  // const duplicateUrlRows = getDuplicateUrls();

  return (
    <fieldset class="flex h-96 w-full flex-col gap-2 overflow-y-auto py-2">
      <For each={rows}>
        {(row, i) => (
          <span class="flex items-center gap-2 px-2">
            <input
              class="w-64 px-2"
              type="text"
              placeholder="triggers (comma-separated)"
              value={row.triggers.join(", ")}
              onFocus={() => setFocus(i())}
              onChange={(e) => {
                const newTriggers = e.currentTarget.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);

                setRows(i(), "triggers", newTriggers);
              }}
            />
            ➜
            <input
              class="flex-1 px-2"
              type="text"
              placeholder="redirect URL (use `{{{s}}}` as placeholder for search queries)"
              value={row.url}
              onFocus={() => setFocus(i())}
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
          </span>
        )}
      </For>

      <Link
        to="/edit"
        search={{
          via: compress(stringify(rows)),
        }}
      >
        <button>Save to URL</button>
      </Link>

      {/* <UrlPreview
        url={
          window.location.origin + "/go?to=%s&via=" + compress(stringify(rows))
        }
      /> */}
    </fieldset>
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
