const URL_MARK = "/";

export type RedirectData = { triggers: string[]; url: string };

export function stringify(redirectMap: RedirectData[]): string {
  return redirectMap
    .map(({ triggers, url }) => triggers.join(",") + "," + URL_MARK + url)
    .join(",");
}

export function parse(str: string): RedirectData[] {
  const redirectMap = [] as RedirectData[];
  let triggers = [] as RedirectData["triggers"];

  for (const part of str.split(",")) {
    if (part.startsWith(URL_MARK)) {
      redirectMap.push({ triggers, url: part.slice(URL_MARK.length) });
      triggers = [];
    } else {
      triggers.push(part);
    }
  }

  return redirectMap;
}
