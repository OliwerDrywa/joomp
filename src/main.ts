// import bangs from "./bangs.min.json";
import "./global.css";

type Trigger = keyof typeof import("./bangs.min.json");

const bangListImport =
  // async import for codesplitting
  import("./bangs.min.json") as Promise<Record<Trigger, `http${string}`>>;

const DEFAULT_TRIGGER = "g";

class NoUserInputError extends Error {
  constructor() {
    super(`no bang provided, applying defaults`);
    this.name = "NoBangError";
  }
}

class InvalidTriggerError extends Error {
  constructor(public bang: string) {
    super(`bang "${bang}" is not valid`);
    this.name = "InvalidBangError";
  }
}

async function getRedirectUrl() {
  const thisUrl = new URL(location.href);

  try {
    let query = thisUrl.searchParams.get("q")?.trim() ?? "";
    if (!query) throw new NoUserInputError();

    // cut trigger (e.g.: `!gh`) out from query
    const queryTrigger = query.match(/!(\S+)/i)?.[1]?.toLowerCase();
    query = query.replace(/!\S+\s*/i, "").trim();

    const bangs = await bangListImport;

    if (queryTrigger) {
      const url = bangs[queryTrigger as Trigger];
      if (url) return insertQueryIntoUrl(url, query);
      else throw new InvalidTriggerError(queryTrigger);
    }

    // user didn't typed an invalid bang, apply a default where `default <- url hash ?? local-storage ?? DEFAULT_BANG`

    const local = localStorage.getItem("default-bang");
    // 1. try bang from localStorage, throws if trigger is invalid
    if (local) {
      console.warn(`bang not found, using to local storage bang "${local}"`);

      const url = bangs[local as Trigger];
      if (url) return insertQueryIntoUrl(url, query);
      else throw new InvalidTriggerError(local);
    }

    const hash = thisUrl.hash.slice(1).trim() ?? "";
    // 2. try bang from url hash, throws if trigger is invalid
    if (hash) {
      console.warn(`bang not found. using url hash bang "${hash}"`);

      const url = bangs[hash as Trigger];
      if (url) return insertQueryIntoUrl(url, query);
      else throw new InvalidTriggerError(hash);
    }

    // 3. use hard-coded default bang
    console.warn(`bang not found. using default bang "${DEFAULT_TRIGGER}"`);

    return insertQueryIntoUrl(bangs[DEFAULT_TRIGGER], query);
  } catch (err) {
    // TODO error handling - look up wix guidelines for error handling
    // https://wix-ux.com/when-life-gives-you-lemons-write-better-error-messages-46c5223e1a2f

    switch (true) {
      case err instanceof NoUserInputError: {
        // Redirect to dashboard instead of rendering UI
        return "/dashboard" + thisUrl.hash;
      }

      case err instanceof InvalidTriggerError: {
        console.log(1234);
        // Redirect to dashboard with error context
        return (
          "/dashboard?error=invalid-bang&bang=" +
          encodeURIComponent(err.message)
        );
      }

      default: {
        console.error("Unexpected error:", err);
        throw err; // rethrow unexpected errors
      }
    }
  }
}

function insertQueryIntoUrl(url: string, query: string): string {
  // if the url doesn't contain `{{{s}}}`, just return it as is
  if (!url.includes("{{{s}}}")) return url;

  // If the query is just `!gh`, use `https://github.com` instead of `https://github.com/search?q=`
  if (query === "") return new URL(url).origin;

  return url.replaceAll(
    // Format of the url is: https://www.google.com/search?q={{{s}}}
    "{{{s}}}",
    // Replace %2F with / to fix formats like "!ghr+t3dotgg/unduck"
    encodeURIComponent(query).replace(/%2F/g, "/"),
  );
}

getRedirectUrl().then(
  (url) => window.location.replace(url),
  // console.log(`Redirecting to: ${url}`),
);
