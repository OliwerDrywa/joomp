const PUBLIC_APEX_HOST = "joomp.link";
const MAX_ENGINE_NAME_LENGTH = 16;

export function clampEngineNameInput(input: { value: string }) {
  const clamped = Array.from(input.value)
    .slice(0, MAX_ENGINE_NAME_LENGTH)
    .join("");
  if (input.value !== clamped) input.value = clamped;
  return clamped;
}

export function normalizeEngineName(name: string | null | undefined) {
  const xmlSafe = Array.from(name ?? "")
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return (
        codePoint === 0x09 ||
        codePoint === 0x0a ||
        codePoint === 0x0d ||
        (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff)
      );
    })
    .join("");
  const trimmed = xmlSafe.trim() || "joomp";
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
