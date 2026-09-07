import RedirectMap from "../src/lib/redirectTree";
import { DEFAULT_B } from "../src/lib/defaultConfig";

type RequestLike = { headers?: Record<string, string | string[] | undefined>; url?: string };
type ResponseLike = {
  end: (body: string) => void;
  setHeader: (name: string, value: string) => void;
};

const MAX_CONFIG_LENGTH = 8_192;

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeConfig(config: string | null): string {
  if (!config || config.length > MAX_CONFIG_LENGTH) return DEFAULT_B;
  try {
    RedirectMap.deserialize(config);
    return config;
  } catch {
    return DEFAULT_B;
  }
}

export function descriptor(config: string, origin: string) {
  const encodedConfig = encodeURIComponent(config);
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>joomp</ShortName>
  <Description>joomp straight to it</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${xmlEscape(origin)}/favicon.ico</Image>
  <Url type="application/x-suggestions+json"
       template="${xmlEscape(`${origin}/api/suggest?q={searchTerms}&b=${encodedConfig}`)}"/>
  <Url type="text/html"
       template="${xmlEscape(`${origin}/x?q={searchTerms}&b=${encodedConfig}`)}"/>
</OpenSearchDescription>
`;
}

function requestUrl(req: RequestLike) {
  const protocol = String(req.headers?.["x-forwarded-proto"] ?? "https").split(",")[0];
  const host = String(req.headers?.host ?? "localhost");
  return new URL(req.url ?? "/api/opensearch", `${protocol}://${host}`);
}

export default function handler(req: RequestLike, res: ResponseLike) {
  const url = requestUrl(req);
  res.setHeader("content-type", "application/opensearchdescription+xml; charset=utf-8");
  res.setHeader("cache-control", "private, no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(descriptor(safeConfig(url.searchParams.get("b")), url.origin));
}
