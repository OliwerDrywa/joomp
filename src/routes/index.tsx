import { createFileRoute, Link, useSearch } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const search = useSearch({ strict: false });

  return (
    <>
      <section class="flex max-w-2xl flex-col gap-3 leading-6.5">
        <h2 class="font-mono text-2xl">What is this?</h2>
        <p>
          <a href="https://duckduckgo.com/bangs">
            <code class="font-mono">!bangs</code>
          </a>
          , in DuckDuckGo, are shortcuts that let you search through other
          search engines and websites. It is however slower than it needs to
          be...
        </p>

        <p>
          <a href="https://github.com/T3-Content/unduck">und*ck</a> is a small
          app that yoinks DuckDuckGo's list of bangs and performs the redirects
          locally, significantly speeding up the search.
        </p>

        <p>
          This is a fork of{" "}
          <a href="https://github.com/T3-Content/unduck">und*ck</a>, but I've
          ditched the long list of bangs DuckDuckGo's users have amassed; many
          urls in the list repeat, many more don't work anymore, and all the
          good single-character shortcuts have been used up on websites I don't
          use! Instead
        </p>
      </section>

      <section class="flex max-w-2xl flex-col gap-2 leading-6.5">
        <h2 class="font-mono text-2xl">How to use:</h2>
        <ol class="list-inside list-decimal">
          <li>
            Use the{" "}
            <Link search={search()} to="/edit">
              editor
            </Link>{" "}
            to create or edit shortcuts to your liking, or use one of the
            presets.
          </li>
          <li>Copy the URL and add it to your browser's search settings.</li>
          <li>Done! You can now use the shortcuts in your browser's search.</li>
        </ol>
      </section>
    </>
  );
}
