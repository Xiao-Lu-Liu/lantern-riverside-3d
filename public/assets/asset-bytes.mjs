// Fetch decodes HTTP Content-Encoding before exposing the response body.
// Static hosts without that header still return the actual gzip file bytes.
export async function decodeAssetBytes(buffer) {
  const header = new Uint8Array(buffer, 0, Math.min(3, buffer.byteLength));
  if (header[0] !== 0x1f || header[1] !== 0x8b || header[2] !== 8) return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

export async function fetchAssetBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset resource ${response.status}: ${url}`);
  return decodeAssetBytes(await response.arrayBuffer());
}
