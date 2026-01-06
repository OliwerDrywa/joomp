import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import RedirectMap from "@/lib/redirectTree";

export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useSearch();
  const tree = RedirectMap.fromString(params().b);
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
            .filter(Boolean)
            .map((q) => {
              // Try user's custom tree first
              if (props.tree) {
                try {
                  const urls = props.tree.getRedirectUrls(q);
                  if (urls.length > 0) {
                    return urls.toString();
                  }
                } catch {
                  // Fall through to default
                }
              }

              // // Fall back to default ddg bangs
              // try {
              //   const [bang, query] = parseQuery(q);
              //   if (!bang) {
              //   }

              //   defaultBangs[bang];

              //   const urls = defaultTree.navigate(q);
              //   if (urls.length > 0) {
              //     return urls.join(" | ");
              //   }
              // } catch {
              //   // Fall through to error
              // }

              return `Error: query "${q}" did not match any command`;
            })}
        >
          {(url) => <span class="flex gap-2 text-nowrap">{url}</span>}
        </For>
      </div>
    </div>
  );
}
