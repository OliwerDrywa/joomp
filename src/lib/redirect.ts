import { decompress } from "@/lib/compression";

export function getSearchParams() {
  const params = new URL(location.href).searchParams;
  return { to: params.get("to"), via: params.get("via") };
}

export function getRedirectUrl(search: ReturnType<typeof getSearchParams>) {
  if (!search.to || !search.via) return "/";

  // cut bang (e.g.: `!gh`) out from query
  const bang = search.to.match(/!(\S+)/i)?.[1]?.toLowerCase();
  const query = search.to.replace(/!\S+\s*/i, "").trim(); // could be ""

  const via = decompress(search.via);

  const url = (() => {
    // find bang in `via`
    // if no bang or first bang, use the first url in the list
    const i = (() => {
      if (!bang) return 0;
      if (via.startsWith(bang + ",")) return 0;
      return via.indexOf("," + bang + ",");
    })();

    if (i === -1) {
      // if the bang does not exist in the provided map
      // redirect to edit page with notFound parameter
      return "/edit?notFound=" + bang + "&via=" + search.via;
    }

    // after `position`, find next url between "//" and the following ","
    const urlStart = via.indexOf(",/", i);
    if (urlStart === -1) throw "malformed `?via=` parameter: " + via; // TODO see if we can revocver this

    const urlEnd = (() => {
      const i = via.indexOf(",", urlStart + 2);
      if (i === -1) return undefined; // we are at the end of the list, take the whole remainder of the string by not setting an end parameter
      return i;
    })();

    return "https://" + via.slice(urlStart + 2, urlEnd);
  })();

  // if the url doesn't contain `{{{s}}}`, just return it as is
  if (!url.includes("{{{s}}}")) return url;

  // Format of url should be: google.com/search?q={{{s}}}

  // If the  query is just `!gh`, use `https://github.com` instead of `https://github.com/search?q=`
  if (query === "") return new URL(url).origin;

  return url.replaceAll(
    "{{{s}}}",
    // Replace %2F with / to fix formats like "!ghr+t3dotgg/unduck"
    encodeURIComponent(query).replace(/%2F/g, "/"),
  );
}
