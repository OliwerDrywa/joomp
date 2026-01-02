import { compressToBase64 } from "lz-string";

export function compress(str: string) {
  return compressToBase64(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
