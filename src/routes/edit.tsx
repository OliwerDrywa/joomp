import { createFileRoute, Link } from "@tanstack/solid-router";
import { createEffect, createSignal, For } from "solid-js";
import { stringify, parse } from "@/lib/parsing";
import { getRedirectUrl } from "@/lib/redirect";
import { compress } from "@/lib/compression";
import { type } from "arktype";
// import bangs from "@/bangs.min.json";

// function getBangs(takeN?: number) {
//   const allBangs = Object.entries(
//     Object.entries(bangs).reduce(
//       (A, [trigger, url]) => {
//         url = url.split("//")[1] ?? url;
//         if (url.startsWith("www.")) url = url.slice(4);

//         A[url] ??= [];
//         A[url].push(trigger);
//         return A;
//       },
//       {} as Record<string, string[]>,
//     ),
//   ).map(([url, triggers]) => [...triggers, url]);

//   return takeN ? allBangs.slice(0, takeN) : allBangs;
// }

export const Route = createFileRoute("/edit")({
  component: IndexComponent,
  validateSearch: type({
    "notFound?": "string", // user typed a trigger but it was not found in the list
    via: "string[][]", // list of bangs, each bang is an array of [trigger,
  }),
});

function IndexComponent() {
  const search = Route.useSearch();

  createEffect(() => {
    console.log(JSON.stringify(search(), null, 2));
  });

  return (
    <div class="text-center">
      <main>
        <BangExamples />
        <BangEditor value={search().via} />
        <BangTester via={compress(stringify(search().via))} />
      </main>
    </div>
  );
}

function BangExamples() {
  return (
    <nav class="w-full flex justify-center gap-4 mb-4">
      <Link
        to="/edit"
        search={{
          notFound: "yt",
          via: [["ddg", "duckduckgo.com/?q={{{s}}}"]],
        }}
      >
        minimal
      </Link>

      <Link
        to="/edit"
        search={{
          via: [
            ["ddg", "duckduckgo.com/?q={{{s}}}"],
            ["g", "google", "google.com/search?q={{{s}}}"],
            ["t3", "t3.chat/new?q={{{s}}}"],
            ["gh", "github.com/search?q={{{s}}}"],
            ["yt", "youtube.com/results?search_query={{{s}}}"],
            ["w", "wiki", "wikipedia.org/wiki/Special:Search?search={{{s}}}"],
          ],
        }}
      >
        default
      </Link>

      {/* <Link
        to="/edit"
        search={{
          via: getBangs(500), // to be safe, max 500 bangs
        }}
      >
        all
      </Link> */}
    </nav>
  );
}

function BangEditor(props: { value: string[][] }) {
  const [draft, setDraft] = createSignal(props.value);

  // createEffect(() => {
  //   console.log(JSON.stringify(props.value, null, 2));
  //   console.log(JSON.stringify(draft(), null, 2));
  // });

  return (
    <div>
      <textarea
        class="w-full h-64 p-2 border border-gray-300 rounded"
        value={stringify(props.value)}
        onInput={(e) => setDraft(parse(e.currentTarget.value))}
      />

      <Link
        to="/edit"
        search={{ via: draft() }}
        class="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save
      </Link>
    </div>
  );

  // createEffect(() => {
  //   // add an empty row `[]` at the end if the last row is not empty
  //   if (
  //     draft().length === 0 ||
  //     draft()
  //       .at(-1)
  //       ?.every((v) => v.trim() !== "")
  //   ) {
  //     setDraft([...draft(), ["", ""]]);
  //   }
  // });

  // const createRow = () => setDraft([...draft(), ["", ""]]);

  // const updateRow = (index: number, newValue: string[]) =>
  //   setDraft(draft().map((row, i) => (i === index ? newValue : row)));

  // const deleteRow = (index: number) =>
  //   setDraft(draft().filter((_, i) => i !== index));

  // return (
  //   <div class="flex flex-col gap-2">
  //     <div class="flex justify-between items-center mb-2">
  //       <h3 class="text-lg font-semibold">Bang Editor</h3>
  //       <button
  //         class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
  //         onClick={createRow}
  //       >
  //         Add Row
  //       </button>
  //     </div>

  //     <div class="flex flex-col gap-2 h-96 overflow-y-auto border border-gray-300 p-2">
  //       <For
  //         each={draft()}
  //         fallback={
  //           <div class="text-gray-500 text-center py-8">
  //             No bangs configured. Click "Add Row" to get started.
  //           </div>
  //         }
  //       >
  //         {(props, i) => {
  //           const url = props.at(-1) ?? "";
  //           const triggers = props.slice(0, -1);

  //           return null;
  //           <div class="flex gap-2 items-center">
  //             <input
  //               class="flex-1"
  //               type="text"
  //               placeholder="triggers (comma-separated)"
  //               value={triggers.join(", ")}
  //               onChange={(e) => {
  //                 const newTriggers = e.currentTarget.value
  //                   .split(",")
  //                   .map((t) => t.trim())
  //                   .filter(Boolean);

  //                 updateRow(i(), [...newTriggers, url]);
  //               }}
  //             />
  //             ➜
  //             <input
  //               class="flex-2"
  //               type="text"
  //               placeholder="URL"
  //               value={url}
  //               onChange={(e) => {
  //                 const newUrl = e.currentTarget.value;
  //                 updateRow(i(), [...triggers, newUrl]);
  //               }}
  //             />
  //             <button
  //               class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
  //               onClick={() => deleteRow(i())}
  //             >
  //               ✕
  //             </button>
  //           </div>
  //         }}
  //       </For>
  //     </div>
  //   </div>
  // );
}

function BangTester(props: { via: string }) {
  const [testQuery, setTestQuery] = createSignal(
    "!g <search-term>\n!yt\n!wiki url\n!w\n!foo",
  );

  return (
    <div class="flex flex-col gap-2 mt-4">
      <div class="flex gap-2 h-64">
        <textarea
          class="flex-1 h-full p-2 border border-gray-300 rounded"
          value={testQuery()}
          onInput={(e) => setTestQuery(e.currentTarget.value)}
        />
        ➜
        <div class="flex-2 flex flex-col h-full p-2 border border-gray-300 rounded overflow-x-scroll">
          <For
            each={testQuery()
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((to) => getRedirectUrl({ to, via: props.via }))}
          >
            {(url) => <span class="gap-2 flex text-nowrap">{url}</span>}
          </For>
        </div>
      </div>

      <label class="flex gap-2">
        go url:
        <input
          class="flex-1"
          type="text"
          readOnly
          value={"http://localhost:3000" + "/go?to=%s&via=" + props.via}
        />
      </label>
    </div>
  );
}
