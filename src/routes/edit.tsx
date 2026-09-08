import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import {
  buildEngineEditUrl,
  clampEngineNameInput,
  normalizeEngineName,
} from "@/lib/engineIdentity";
import RedirectMap from "@/lib/redirectTree";

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

function EditPage() {
  const params = Route.useSearch();
  return <DslEditor b={params().b} name={params().n} />;
}

function useSearchLink(b: () => string, name: () => string) {
  const link = document.createElement("link");
  link.rel = "search";
  link.type = "application/opensearchdescription+xml";
  document.head.appendChild(link);
  createEffect(() => {
    const normalizedName = normalizeEngineName(name());
    link.title = normalizedName;
    link.href = `/api/opensearch?b=${encodeURIComponent(b())}&n=${encodeURIComponent(normalizedName)}`;
  });
  onCleanup(() => link.remove());
}

function DslEditor(props: { b: string; name?: string }) {
  const initialDsl = createMemo(() => RedirectMap.deserialize(props.b).toDSL());
  const initialName = createMemo(() => normalizeEngineName(props.name));
  const [dsl, setDsl] = createSignal(initialDsl());
  const [name, setName] = createSignal(initialName());
  const [error, setError] = createSignal<string | null>(null);

  useSearchLink(() => props.b, initialName);

  createEffect(() => {
    setDsl(initialDsl());
    setName(initialName());
  });

  const newPropsB = createMemo(() => {
    try {
      const tree = RedirectMap.fromDSL(dsl());
      setError(null);
      return tree.serialize();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid syntax");
      return props.b;
    }
  });

  const normalizedName = createMemo(() => normalizeEngineName(name()));
  const hasChanges = createMemo(
    () => newPropsB() !== props.b || normalizedName() !== initialName(),
  );

  return (
    <>
      <UrlPreview url={"/x?q=%s&b=" + newPropsB()} />

      <form
        class="flex flex-col gap-4"
        onsubmit={async (event) => {
          event.preventDefault();
          if (error()) return;
          const next = await buildEngineEditUrl(
            window.location.href,
            newPropsB(),
            normalizedName(),
          );
          window.location.assign(next);
        }}
      >
        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-500" for="engine-name">
            Search engine name (16 characters maximum)
          </label>
          <input
            id="engine-name"
            class="w-full border p-3 dark:border-neutral-400 dark:bg-neutral-900"
            value={name()}
            onInput={(event) =>
              setName(clampEngineNameInput(event.currentTarget))
            }
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm text-neutral-500" for="command-definitions">
            Command definitions (<code>!cmd ...</code> = with text,{" "}
            <code>!cmd</code> = exact match)
          </label>
          <textarea
            id="command-definitions"
            class="h-96 w-full resize-y border p-3 font-mono text-sm text-nowrap dark:border-neutral-400 dark:bg-neutral-900"
            value={dsl()}
            onInput={(event) => setDsl(event.currentTarget.value)}
            spellcheck={false}
          />
          {error() && <div class="text-sm text-red-500">Error: {error()}</div>}
        </div>

        <fieldset class="flex flex-row gap-2">
          <button
            type="button"
            class="ms-auto cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={!hasChanges()}
            onClick={() => {
              setDsl(initialDsl());
              setName(initialName());
            }}
          >
            Undo
          </button>

          <button
            type="submit"
            class="cursor-pointer border p-2 disabled:cursor-not-allowed disabled:text-neutral-400 dark:border-neutral-400"
            disabled={!hasChanges() || Boolean(error())}
          >
            Save engine
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
        onClick={async (event) => {
          const img = event.currentTarget.firstChild;
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
