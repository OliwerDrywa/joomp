import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import RedirectMap from "@/lib/redirectTree";

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

function EditPage() {
  const params = Route.useSearch();
  return <DslEditor b={params().b} />;
}

/**
 * Expose THIS user's config to Chrome's search-engine discovery by pointing
 * <link rel="search"> at the dynamic descriptor carrying their `b`. Chrome
 * reads this from the live DOM, so a per-user link here is enough — no
 * per-user index.html needed.
 */
function useSearchLink(b: () => string) {
  const link = document.createElement("link");
  link.rel = "search";
  link.type = "application/opensearchdescription+xml";
  link.title = "joomp";
  document.head.appendChild(link);
  createEffect(() => {
    link.href = `/api/opensearch?b=${encodeURIComponent(b())}`;
  });
  onCleanup(() => link.remove());
}

function DslEditor(props: { b: string }) {
  const navigate = Route.useNavigate();

  // Point search-engine discovery at this user's saved config.
  useSearchLink(() => props.b);

  // Parse initial tree from compressed param
  const initialDsl = createMemo(() => {
    return RedirectMap.deserialize(props.b).toDSL();
  });

  const [dsl, setDsl] = createSignal(initialDsl());
  const [error, setError] = createSignal<string | null>(null);

  // Update dsl when props.b changes
  createEffect(() => {
    setDsl(initialDsl());
  });

  // Validate and compute compressed output
  const newPropsB = createMemo(() => {
    try {
      const tree = RedirectMap.fromDSL(dsl());
      setError(null);
      return tree.serialize();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid syntax");
      return props.b; // Return original on error
    }
  });

  const hasChanges = createMemo(() => newPropsB() !== props.b && !error());

  return (
    <>
      <UrlPreview url={"/x?q=%s&b=" + newPropsB()} />

      <form
        class="flex flex-col gap-4"
        onsubmit={(e) => {
          e.preventDefault();
          if (error()) return;

          navigate({
            to: "/edit",
            search: { b: newPropsB() },
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
