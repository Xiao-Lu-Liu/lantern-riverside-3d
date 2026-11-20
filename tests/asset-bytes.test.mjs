import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { decodeAssetBytes, fetchAssetBytes } from '../public/assets/asset-bytes.mjs';

const bytes = Buffer.from('{"geometry":"灯会模型"}');
const arrayBuffer = buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

test('a static host returning actual gzip bytes is decoded once', async () => {
  const result = await decodeAssetBytes(arrayBuffer(gzipSync(bytes)));
  assert.deepEqual(Buffer.from(result), bytes);
});

test('an HTTP-decoded response is accepted without a second decompression', async () => {
  const result = await decodeAssetBytes(arrayBuffer(bytes));
  assert.deepEqual(Buffer.from(result), bytes);
});

test('an unavailable asset reports its HTTP status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('missing', { status: 404 });
  try { await assert.rejects(fetchAssetBytes('/missing.bin.gz'), /404/); }
  finally { globalThis.fetch = originalFetch; }
});
