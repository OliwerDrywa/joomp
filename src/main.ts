const url = new URL(location.href);
let query = url.searchParams.get("q")?.trim() ?? "";

// TODO error handling - like https://wix-ux.com/when-life-gives-you-lemons-write-better-error-messages-46c5223e1a2f
await getRedirectUrl()
  .then((url) => {
    // if the url doesn't contain `{{{s}}}`, just return it as is
    if (!url.includes("{{{s}}}")) return url;

    // Format of url should be: https://www.google.com/search?q={{{s}}}
    // TODO: maybe add tests to verify the json file if this ^ is true ?

    // If the  query is just `!gh`, use `https://github.com` instead of `https://github.com/search?q=`
    if (query === "") return new URL(url).origin;

    return url.replaceAll(
      "{{{s}}}",
      // Replace %2F with / to fix formats like "!ghr+t3dotgg/unduck"
      encodeURIComponent(query).replace(/%2F/g, "/"),
    );
  })
  .catch((err: Error) => `/settings${err.message}`)
  .then((url) => window.location.replace(url));

async function getBangs(): Promise<Record<string, string>> {
  const local = localStorage?.getItem?.("appNameTODO-bangs");

  // if local storage is empty, load the default bangs and set it to local storage
  if (!local) {
    const imported = await import("./bangs.min.json");
    localStorage?.setItem?.(
      "appNameTODO-bangs",
      JSON.stringify(imported.default),
    );
    return imported.default;
  }

  try {
    return JSON.parse(local);
  } catch (err) {
    throw new Error("?localStorageError");
  }
}

async function getRedirectUrl() {
  if (!query) throw new Error(url.hash);

  // cut trigger (e.g.: `!gh`) out from query
  let trigger = query.match(/!(\S+)/i)?.[1]?.toLowerCase() ?? null;
  query = query.replace(/!\S+\s*/i, "").trim();

  const bangs = await getBangs();

  if (trigger) {
    const url = bangs[trigger];
    if (url) return url;
    else throw new Error("?invalidBang=" + encodeURIComponent(trigger));
  }

  // user typed an invalid bang, apply a default
  // where `default = url hash ?? local-storage ?? google`

  // 1. try bang from localStorage
  trigger = localStorage?.getItem?.("appNameTODO-default-bang");
  if (trigger) {
    console.warn(`bang not found, using to local storage bang "${trigger}"`);

    const url = bangs[trigger];
    if (url) return url;
    else throw new Error("?invalidBang=" + encodeURIComponent(trigger));
  }

  // 2. try bang from url hash
  trigger = url.hash.slice(1).trim() ?? null;
  if (trigger) {
    console.warn(`bang not found. using url hash bang "${trigger}"`);

    const url = bangs[trigger];
    if (url) return url;
    else throw new Error("?invalidBang=" + encodeURIComponent(trigger));
  }

  // 3. default to hard-coded bang
  console.warn(`bang not found. defaulting to Google`);
  return bangs.g;
}
