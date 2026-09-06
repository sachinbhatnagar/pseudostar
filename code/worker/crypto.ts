const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, '0')).join('');
export async function hmac(secret: string, value: string) {
  if (secret.length < 32) throw new Error('Authentication configuration is incomplete.');
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}
export async function hash(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}
export function token() {
  return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
export function code() {
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= 4294000000);
  return String(values[0] % 1000000).padStart(6, '0');
}
