import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import {
  type CommandDefinitionTree,
  deserializeCommandTree,
  executeCommand,
  MATCH_ALL,
} from "@/lib/commands";
import defaultBangs from "@/lib/bangs.min.json";
import { decompress } from "@/lib/compression";

export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useSearch();
  const decompressed = decompress(params().b);
  let tree: CommandDefinitionTree | null = null;
  if (decompressed) {
    try {
      tree = deserializeCommandTree(decompressed);
    } catch {
      tree = null;
    }
  }
  return <RedirectTester tree={tree} />;
}

/**
 * Build a CommandDefinitionTree from the default bangs JSON.
 * Each bang key maps to a subtree with MATCH_ALL pointing to the URL.
 */
function buildDefaultBangsTree(): CommandDefinitionTree {
  const tree: CommandDefinitionTree = {
    [MATCH_ALL]: ["https://duckduckgo.com/?q={{{s}}}"],
  };
  for (const [bang, url] of Object.entries(defaultBangs)) {
    tree["!" + bang] = { [MATCH_ALL]: [url] };
  }
  return tree;
}

function RedirectTester(props: { tree: CommandDefinitionTree | null }) {
  const [testQuery, setTestQuery] = createSignal(
    "!g <search-term>\n!yt\n!wiki url\n!foo\n!todo be awesome",
  );

  const defaultTree = buildDefaultBangsTree();

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
                  const urls = executeCommand(q, props.tree);
                  if (urls.length > 0) {
                    return urls.join(" | ");
                  }
                } catch {
                  // Fall through to default
                }
              }

              // Fall back to default bangs tree
              try {
                const urls = executeCommand(q, defaultTree);
                if (urls.length > 0) {
                  return urls.join(" | ");
                }
              } catch {
                // Fall through to error
              }

              return `Error: query "${q}" did not match any command`;
            })}
        >
          {(url) => <span class="flex gap-2 text-nowrap">{url}</span>}
        </For>
      </div>
    </div>
  );
}
