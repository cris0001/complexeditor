const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Creates a short, URL-safe random id for a block. */
export function createId(length = 12): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
