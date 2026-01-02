import { decompressFromBase64 } from "lz-string";

export default async function redirect() {
  const params = new URLSearchParams(location.search);

  const q = params.get("q");
  if (!q) throw new Error("missing 'q' parameter");

  const b = params.get("b");
  if (!b) throw new Error("missing 'b' parameter");

  const bangURLs = decompress(b);
  const [bang, query] = parseQuery(q);

  // try to get url from provided list
  let url = findUrl(bangURLs, bang);

  // else try to get url from default bangs
  if (!url) {
    const { default: defaultBangs } = await import("./bangs.min.json");
    url = defaultBangs[bang as keyof typeof defaultBangs];
  }

  // else redirect to /edit
  if (!url) {
    location.replace("/edit" + location.search);
    return;
  }

  url = createRedirectUrl(query, url);

  document.title = `➜ ${new URL(url).hostname}`;
  location.replace(url);

  // if the tab remains open after redirecting (e.g.: opening an app)
  // close tab after a short delay after losing focus
  window.onblur = () => setTimeout(() => window.close(), 5000);
}

export function parseQuery(q: string) {
  // cut bang (e.g.: `!gh`) out from query
  const bang = q.match(/!(\S+)/i)?.[1]?.toLowerCase();
  const query = q.replace(/!\S+\s*/i, "").trim(); // could be ""
  return [bang, query] as [bang: string | undefined, search_query: string];
}

export function findUrl(bangList: string, bang?: string) {
  let url: string | undefined;

  // if no bang, use the first URL in the list
  // if bang is present, find the URL that matches the bang
  // if bang is not found, returns undefined
  for (const row of split(bangList, ",")) {
    if (!bang) {
      // if no bang, use the first URL in the list
      url = row.slice(row.lastIndexOf(">") + 1);
      break;
    }

    const i = row.indexOf(bang + ">");
    if (i === -1) continue;

    if (i === 0 || row.at(i - 1) === ">") {
      const urlStart = row.lastIndexOf(">") + 1;
      url = row.slice(urlStart);
      break;
    }
  }

  return url;
}

export function createRedirectUrl(query: string, url: string) {
  // prefix with https:// if url lacks a protocol://
  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = "https://" + url;
  }

  // inject the search query into the URL
  if (query && url.includes("{{{s}}}")) {
    // replace %2F with / to fix queries like `!ghr+t3dotgg/unduck`
    query = encodeURIComponent(query).replace(/%2F/g, "/");
    url = url.replaceAll("{{{s}}}", query);
  }

  // if the query is empty (after cutting out the bang `!gh`) -
  // use `https://github.com` instead of `https://github.com/search?q=
  if (!query && url.includes("{{{s}}}")) {
    url = new URL(url).origin;
  }

  return url;
}

/**
 * String.split() but as a lazy generator.
 * @param str The string to split.
 * @param delimiter The delimiter to split the string by.
 * @returns A generator that yields each split segment.
 */
export function* split(
  str: string,
  delimiter: string,
): Generator<string, void, unknown> {
  let i = 0;
  let j = str.indexOf(delimiter);

  while (j !== -1) {
    yield str.slice(i, j);
    i = j + delimiter.length;
    j = str.indexOf(delimiter, i);
  }

  yield str.slice(i); // the remainder
}

export function decompress(str: string) {
  // Convert URL-safe base64 back to standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "="; // Add padding if needed

  return decompressFromBase64(base64);
}
