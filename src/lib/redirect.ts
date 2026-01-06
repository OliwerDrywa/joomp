import RedirectMap from "./redirectTree";

export default function redirect() {
  const params = new URLSearchParams(location.search);

  const q = params.get("q");
  if (!q) throw new Error("missing 'q' parameter");

  const b = params.get("b");
  if (!b) throw new Error("missing 'b' parameter");

  const tree = RedirectMap.fromString(b);
  const urls = tree.getRedirectUrls(decodeURI(q));

  for (const url of urls) location.replace(url);

  const finalUrl = urls.at(-1)!;
  document.title = `➜ ${finalUrl}`;

  // // close tab if redirecting to external app
  // if (
  //   finalUrl.includes("://") &&
  //   !(finalUrl.includes("https://") || finalUrl.includes("http://"))
  // ) {
  //   document.onvisibilitychange = () => {
  //     if (document.visibilityState === "visible") return;
  //     window.close();
  //   };

  //   // show "You may now close this tab"
  //   setTimeout(() => document.body.classList.add("show-close-ui"), 1500);
  // }
}

// export default async function redirect() {
//   const params = new URLSearchParams(location.search);

//   const q = params.get("q");
//   if (!q) throw new Error("missing 'q' parameter");

//   const b = params.get("b");
//   if (!b) throw new Error("missing 'b' parameter");

//   const bangURLs = decompress(b);
//   const [bang, query] = parseQuery(q);

//   // try to get url from provided list
//   let url = findUrl(bangURLs, bang);

//   // else try to get url from default bangs
//   if (!url) {
//     const { default: defaultBangs } = await import("./bangs.min.json");
//     url = defaultBangs[bang as keyof typeof defaultBangs];
//   }

//   // else redirect to /edit
//   if (!url) {
//     location.replace("/edit" + location.search);
//     return;
//   }

//   url = createRedirectUrl(query, url);

//   document.title = `➜ ${new URL(url).hostname}`;
//   location.replace(url);

//   // if the tab remains open after redirecting (e.g.: opening an app)
//   // close tab after a short delay after losing focus
//   window.onblur = () => setTimeout(() => window.close(), 5000);
// }

// export function parseQuery(q: string) {
//   // cut bang (e.g.: `!gh`) out from query
//   const bang = q.match(/!(\S+)/i)?.[1]?.toLowerCase();
//   const query = q.replace(/!\S+\s*/i, "").trim(); // could be ""
//   return [bang, query] as [bang: string | undefined, search_query: string];
// }

// function findUrl(bangList: string, bang?: string) {
//   if (!bang) {
//     // if no bang, use the first URL in the list
//     const comma = bangList.indexOf(",");
//     const row = bangList.slice(0, comma === -1 ? undefined : comma);
//     return row.slice(row.lastIndexOf(">") + 1);
//   }

//   // if bang is present, find the URL that matches the bang
//   // if bang is not found, returns undefined
//   for (const row of split(bangList, ",")) {
//     // TODO - there is a bug here!
//     // given a list like `not-short>short>url.com`
//     // `!short` will incorrectly match the `not-short>`
//     // entry, check char before, see it's part of a
//     // larger string and skip to next **row entirely**
//     //
//     // i.e.: we're assuming the bangs are sorted from smaller to largest
//     const i = row.indexOf(bang + ">");
//     if (i === -1) continue;

//     if (i === 0 || row.at(i - 1) === ">") {
//       const urlStart = row.lastIndexOf(">") + 1;
//       return row.slice(urlStart);
//     }
//   }
// }

// function createRedirectUrl(query: string, url: string) {
//   // prefix with https:// if url lacks a protocol://
//   if (!url.match(/^[a-zA-Z]+:\/\//)) {
//     url = "https://" + url;
//   }

//   // inject the search query into the URL
//   if (query && url.includes("{{{s}}}")) {
//     // replace %2F with / to fix queries like `!ghr+t3dotgg/unduck`
//     query = encodeURIComponent(query).replace(/%2F/g, "/");
//     url = url.replaceAll("{{{s}}}", query);
//   }

//   // if the query is empty (after cutting out the bang `!gh`) -
//   // use `https://github.com` instead of `https://github.com/search?q=
//   if (!query && url.includes("{{{s}}}")) {
//     url = new URL(url).origin;
//   }

//   return url;
// }

// /**
//  * String.split() but as a lazy generator.
//  * @param str The string to split.
//  * @param delimiter The delimiter to split the string by.
//  * @returns A generator that yields each split segment.
//  */
// function* split(
//   str: string,
//   delimiter: string,
// ): Generator<string, void, unknown> {
//   let i = 0;
//   let j = str.indexOf(delimiter);

//   while (j !== -1) {
//     yield str.slice(i, j);
//     i = j + delimiter.length;
//     j = str.indexOf(delimiter, i);
//   }

//   yield str.slice(i); // the remainder
// }
