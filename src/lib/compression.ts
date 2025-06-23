import { deflate, inflate } from "pako";

export function compress(str: string) {
  return btoa(String.fromCharCode(...deflate(new TextEncoder().encode(str))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function decompress(str: string) {
  // Convert URL-safe base64 back to standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  return new TextDecoder().decode(
    inflate(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))),
  );
}
