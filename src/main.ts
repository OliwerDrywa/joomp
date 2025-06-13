import bangs from "./bangs.min.json";
import "./global.css";

type Trigger = keyof typeof bangs;

const DEFAULT_BANG = "g";

class NoBangError extends Error {
  constructor() {
    super(`no bang provided, applying defaults`);
    this.name = "NoBangError";
  }
}

class InvalidBangError extends Error {
  constructor(bang: string) {
    super(`bang "${bang}" is not valid`);
    this.name = "InvalidBangError";
  }
}

async function redirect() {
  const url = new URL(location.href);
  let query = url.searchParams.get("q")?.trim() ?? "";
  let redirectUrl: string = "";

  try {
    if (!query) throw new NoBangError();

    // cut trigger out from query
    const queryTrigger = query.match(/!(\S+)/i)?.[1]?.toLowerCase();
    query = query.replace(/!\S+\s*/i, "").trim();

    if (queryTrigger) {
      redirectUrl = bangs[queryTrigger as Trigger];
      if (redirectUrl) return;
    }

    // user didn't typed an invalid bang, apply a default where `default <- url hash ?? local-storage ?? DEFAULT_BANG`

    const local = localStorage.getItem("default-bang");
    if (local) {
      // 1. try bang from localStorage, throws if trigger is invalid
      console.warn(`bang not found, using to local storage bang "${local}"`);

      redirectUrl = bangs[local as Trigger];
      if (!redirectUrl) throw new InvalidBangError(local);
    }

    const hash = url.hash.slice(1).trim() ?? "";
    if (hash) {
      // 2. try bang from url hash, throws if trigger is invalid
      console.warn(`bang not found. using url hash bang "${hash}"`);

      redirectUrl = bangs[hash as Trigger];
      if (!redirectUrl) throw new InvalidBangError(hash);
    }

    // 3. use hard-coded default bang
    console.warn(`bang not found. using default bang "${DEFAULT_BANG}"`);
    redirectUrl = bangs[DEFAULT_BANG];
  } catch (err) {
    // TODO error handling - look up wix guidelines for error handling
    // https://wix-ux.com/when-life-gives-you-lemons-write-better-error-messages-46c5223e1a2f
    // https://miro.medium.com/v2/resize:fit:720/format:webp/1*lbm-FjstINfLqXVrVMgonA.png

    switch (true) {
      case err instanceof NoBangError: {
        // TODO: render '/' route
        const { renderUI } = await import("./ui.js");
        renderUI();
        return;
      }

      case err instanceof InvalidBangError: {
        // TODO:
        // - render '/customize' route
        // - display error message "bang was not found, suggest user edits their bangs
        const { renderUI } = await import("./ui.js");
        renderUI();
        return;
      }

      default: {
        console.error("Unexpected error:", err);
        return;
      }
    }
  } finally {
    // If the query is just `!gh`, use `https://github.com` instead of `https://github.com/search?q=`
    if (query === "") {
      redirectUrl = new URL(redirectUrl).origin;
    } else {
      redirectUrl = redirectUrl.replace(
        // Format of the url is: https://www.google.com/search?q={{{s}}}
        "{{{s}}}",
        // Replace %2F with / to fix formats like "!ghr+t3dotgg/unduck"
        encodeURIComponent(query).replace(/%2F/g, "/"),
      );
    }

    // add https:// if not present
    if (!redirectUrl.startsWith("http")) {
      redirectUrl = `https://${redirectUrl}`;
    }

    window.location.replace(redirectUrl);
  }
}

await redirect();
