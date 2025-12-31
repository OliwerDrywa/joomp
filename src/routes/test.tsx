import { decompress } from "@/lib/compression";
import { getRedirectUrl } from "@/lib/redirect";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";

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
        class="flex-1 rounded border border-gray-300 p-2"
        value={testQuery()}
        onInput={(e) => setTestQuery(e.currentTarget.value)}
      />
      ➜
      <div class="flex flex-2 flex-col overflow-x-scroll rounded border border-gray-300 p-2">
        <For
          each={testQuery()
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((q) => {
              try {
                return getRedirectUrl(q, props.bangs);
              } catch (e) {
                if (e instanceof Error) return e.message;
                throw e;
              }
            })}
        >
          {(url) => <span class="flex gap-2 text-nowrap">{url}</span>}
        </For>
      </div>
    </div>
  );
}
