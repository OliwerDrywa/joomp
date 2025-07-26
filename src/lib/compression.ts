import { deflate, inflate } from "pako";
import { compressToBase64, decompressFromBase64 } from "lz-string";

export enum Compression {
  None = ">",
  Base64 = "B",
  LZString = "L",
  Gzip = "G",
}

export function compress(str: string, method: Compression) {
  switch (method) {
    case Compression.None:
      return method + str;

    case Compression.Base64:
      return (
        method +
        btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
      );

    case Compression.LZString:
      return (
        method +
        compressToBase64(str)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "")
      );

    case Compression.Gzip:
      return (
        method +
        btoa(String.fromCharCode(...deflate(new TextEncoder().encode(str))))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "")
      );

    default:
      throw new Error(`Unknown compression method: ${method}`);
  }
}

export function decompress(str: string): [str: string, method: Compression] {
  if (str.length === 0) {
    throw new Error("Empty string cannot be decompressed");
  }

  const method = str.charAt(0);
  const data = str.slice(1);

  // Convert URL-safe base64 back to standard base64
  let base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  switch (method) {
    case Compression.None: // No compression, just URL encoded
      return [data, Compression.None];

    case Compression.Base64: // Base64 only
      return [atob(base64), Compression.Base64];

    case Compression.LZString: // LZ-String
      return [decompressFromBase64(base64), Compression.LZString];

    case Compression.Gzip: // Pako
      return [
        new TextDecoder().decode(
          inflate(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))),
        ),
        Compression.Gzip,
      ];

    default:
      throw new Error(`Unknown compression method: ${method}`);
  }
}
