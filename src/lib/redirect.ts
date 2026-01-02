import { decompressFromBase64 } from "lz-string";

export default async function redirect() {
  const params = new URLSearchParams(location.search);
  try {
    const q = params.get("q");
    if (!q) throw new Error("missing 'q' parameter");

    const b = params.get("b");
    if (!b) throw new Error("missing 'b' parameter");

    const url = getRedirectUrl(q, await decompress(b));
    document.title = `➜ ${new URL(url).hostname}`;

    location.replace(url);
  } catch {
    location.replace("/edit" + location.search);
  }
}

/**
 * Get the redirect URL based on the query and links.
 * Can throw string, which is a relative URL to redirect to.
 *
 * @param query The search query, which may include a bang (e.g., `!gh`).
 * @param bangs The original URL or list of URLs to redirect through.
 * @returns The final redirect URL.
 */
export function getRedirectUrl(query: string, bangs: string) {
  // cut bang (e.g.: `!gh`) out from query
  const bang = query.match(/!(\S+)/i)?.[1]?.toLowerCase();
  query = query.replace(/!\S+\s*/i, "").trim(); // could be ""

  let url: string | undefined;

  // if no bang, use the first URL in the list
  // if bang is present, find the URL that matches the bang
  for (const row of split(bangs, ",")) {
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

  if (!url) throw new Error(`no URL found for bang: ${bang}`);

  // prefix with https:// if not already present
  // check for {any protocol}:// to allow custom protocols like ftp://
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

async function decompress(str: string) {
  // Convert URL-safe base64 back to standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "="; // Add padding if needed

  return decompressFromBase64(base64);
}
