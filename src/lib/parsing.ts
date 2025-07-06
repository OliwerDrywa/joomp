import { produce } from "solid-js/store";

const URL_MARK = "/";

export function stringify(value: string[][]): string {
  return addPrefixes(value)
    .map((row) => {
      // row[row.length - 1] = URL_MARK + row[row.length - 1];
      return row.join(",");
    })
    .join(",");
}

export function parse(value: string): string[][] {
  const temp = [[]] as string[][];

  for (const part of value.split(",")) {
    if (part.startsWith(URL_MARK)) {
      temp.at(-1)!.push(part);
      temp.push([]);
    } else {
      temp.at(-1)!.push(part);
    }
  }

  return removePrefixes(temp.slice(0, -1));
}

function removePrefixes(list: string[][]): string[][] {
  return list.map(
    produce((row) => {
      if (row[row.length - 1]?.startsWith(URL_MARK)) {
        row[row.length - 1] = row[row.length - 1].slice(URL_MARK.length);
      }
    }),
  );
}

function addPrefixes(list: string[][]): string[][] {
  return list.map(
    produce((row) => {
      if (!row[row.length - 1]?.startsWith(URL_MARK)) {
        row[row.length - 1] = URL_MARK + row[row.length - 1];
      }
    }),
  );
}
