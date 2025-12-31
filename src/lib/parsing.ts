export type RedirectData = { bangs: string[]; url: string };

export const stringify = (redirectMap: RedirectData[]) =>
  redirectMap
    .filter(({ bangs, url }) => bangs.length > 0 && url)
    .map(({ bangs, url }) => bangs.concat(url).join(">"))
    .join(",");

export const parse = (str: string): RedirectData[] =>
  str
    .split(",")
    .map((row) => {
      const bangs = row.split(">");
      return { bangs, url: bangs.pop()! };
    })
    .filter(({ bangs, url }) => bangs.length > 0 && url);
