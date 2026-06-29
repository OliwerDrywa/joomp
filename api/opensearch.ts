import RedirectMap from "../src/lib/redirectTree";
import { DEFAULT_B } from "../src/lib/defaultConfig";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Validate a compressed config; fall back to the default if it's garbage. */
function safeB(b: string | null): string {
  if (!b) return DEFAULT_B;
  try {
    RedirectMap.deserialize(b); // throws on malformed input
    return b;
  } catch {
    return DEFAULT_B;
  }
}

export function descriptor(b: string, origin: string) {
  const eb = encodeURIComponent(b);
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>joomp</ShortName>
  <Description>joomp straight to it</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${xmlEscape(origin)}/favicon.ico</Image>
  <Url type="application/x-suggestions+json"
       template="${xmlEscape(`${origin}/api/suggest?q={searchTerms}&b=${eb}`)}"/>
  <Url type="text/html"
       template="${xmlEscape(`${origin}/x?q={searchTerms}&b=${eb}`)}"/>
</OpenSearchDescription>
`;
}

export default function handler(req: Request) {
  const url = new URL(req.url);
  const b = safeB(url.searchParams.get("b"));
  return new Response(descriptor(b, url.origin), {
    headers: {
      "content-type": "application/opensearchdescription+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
