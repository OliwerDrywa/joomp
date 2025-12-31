import { compressToBase64, decompressFromBase64 } from "lz-string";

export function compress(str: string) {
  return compressToBase64(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function decompress(str: string) {
  if (str.length === 0) {
    throw new Error("Empty string cannot be decompressed");
  }

  // Convert URL-safe base64 back to standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "="; // Add padding if needed

  return decompressFromBase64(base64);
}
