import { createFileRoute, Link } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const search = Route.useSearch();

  return (
    <>
      <section class="mx-auto flex w-2xl flex-col gap-3 px-6 leading-6.5">
        <h2 class="font-mono text-2xl">What is this?</h2>
        <p class="text-justify">
          <a href="https://duckduckgo.com/bangs">
            <code class="font-mono">!bangs</code>
          </a>
          , in DuckDuckGo, are shortcuts that let you search through other
          search engines and websites. It is however slower than it needs to
          be...
        </p>

        <p class="text-justify">
          <a href="https://github.com/T3-Content/unduck">und*ck</a> is a small
          app that yoinks DuckDuckGo's list of bangs and performs the redirects
          locally, significantly speeding up the search.
        </p>

        <p class="text-justify">
          This is a fork of{" "}
          <a href="https://github.com/T3-Content/unduck">und*ck</a>, but I've
          ditched the long list of bangs DuckDuckGo's users have amassed; many
          urls in the list repeat, many more don't work anymore, and all the
          good single-character shortcuts have been used up on websites I don't
          use!
        </p>
        <p class="text-justify">
          Here, all redirects are made easily customizable instead, and your
          personal list of redirects is stored in the URL itself. Simply use the{" "}
          <Link search={search()} to="/edit">
            editor
          </Link>{" "}
          to personalize the redirects, and paste the created URL into your
          browser's search settings.
        </p>
      </section>

      <details class="mx-auto flex w-2xl flex-col gap-3 px-6 leading-6.5">
        <summary class="py-4">
          <h2 class="inline ps-4 font-mono text-2xl">The caveats...</h2>
        </summary>

        <ul class="flex list-inside list-disc flex-col gap-2">
          <li>
            <p class="inline text-justify">
              Your list of redirects is <b>NOT</b> private - The entire list of
              redirects is stored in the URL, and although it is not
              human-legible when compressed, it can be decompressed trivially.
              Therefore, anyone who catches a glimpse of your URL can see what
              shortcuts you've set
            </p>
          </li>

          <li>
            <p class="inline text-justify">
              The URL is long and ugly, and it will show up in your browser's
              search history.
            </p>
          </li>

          <li>
            <p class="inline text-justify">
              There is a limit on characters in the URL. From the testing I've
              done, the limit is about ~500 different redirects (when compressed
              with Pako), but your mileage may vary depending on the browser you
              use, how long your URLs are, and what compression algorithm you
              use.
            </p>
          </li>
        </ul>
      </details>
    </>
  );
}
