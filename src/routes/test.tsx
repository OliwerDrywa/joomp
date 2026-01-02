import { findUrl, createRedirectUrl, parseQuery } from "@/lib/redirect";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import defaultBangs from "@/lib/bangs.min.json";
import { decompress } from "lz-string";

export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useSearch();
  const [bangs] = decompress(params().b);
  return <RedirectTester bangs={bangs} />;
}

function RedirectTester(props: { bangs: string }) {
  const [testQuery, setTestQuery] = createSignal(
    "!g <search-term>\n!yt\n!wiki url\n!foo",
  );

  return (
    <div class="flex h-64 max-w-3xl gap-2">
      <textarea
        class="flex-1 border border-neutral-300 p-2"
        value={testQuery()}
        onInput={(e) => setTestQuery(e.currentTarget.value)}
      />
      ➜
      <div class="flex flex-2 flex-col overflow-x-scroll border border-neutral-300 p-2">
        <For
          each={testQuery()
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((q) => {
              const [bang, query] = parseQuery(q);
              let url = findUrl(props.bangs, bang);

              if (!url) {
                url = defaultBangs[bang as keyof typeof defaultBangs];
              }

              if (!url) {
                return `Error: bang !${bang} does not match any URL`;
              }

              url = createRedirectUrl(query, url);

              return url;
            })}
        >
          {(url) => <span class="flex gap-2 text-nowrap">{url}</span>}
        </For>
      </div>
    </div>
  );
}
