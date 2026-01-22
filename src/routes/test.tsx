import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import RedirectMap from "@/lib/redirectTree";

export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useSearch();
  const tree = RedirectMap.deserialize(params().b);
  return <RedirectTester tree={tree} />;
}

function RedirectTester(props: { tree: RedirectMap }) {
  const [testQuery, setTestQuery] = createSignal(
    "!g <search-term>\n!yt\n!wiki url\n!foo\n!todo be awesome",
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
            .map((q) => props.tree.getRedirectUrls(q))}
        >
          {(url) => <span class="flex gap-2 text-nowrap">{url}</span>}
        </For>
      </div>
    </div>
  );
}
