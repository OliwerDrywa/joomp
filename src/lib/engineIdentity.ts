const PUBLIC_APEX_HOST = "joomp.link";
const MAX_ENGINE_NAME_LENGTH = 16;

export function normalizeEngineName(name: string | null | undefined) {
  const trimmed = name?.trim() || "joomp";
  return Array.from(trimmed).slice(0, MAX_ENGINE_NAME_LENGTH).join("");
}

export async function engineSlug(config: string) {
  const bytes = new TextEncoder().encode(config);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `j-${hex.slice(0, 16)}`;
}

export async function buildEngineEditUrl(
  currentUrl: string,
  config: string,
  name: string,
) {
  const url = new URL("/edit", currentUrl);
  if (
    url.hostname === PUBLIC_APEX_HOST ||
    url.hostname.endsWith(`.${PUBLIC_APEX_HOST}`)
  ) {
    url.hostname = `${await engineSlug(config)}.${PUBLIC_APEX_HOST}`;
    url.port = "";
    url.protocol = "https:";
  }
  url.search = "";
  url.searchParams.set("b", config);
  url.searchParams.set("n", normalizeEngineName(name));
  return url;
}
