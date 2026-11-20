import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { openScene } from './browser.mjs';

const output = path.resolve(process.env.VIDEO_OUTPUT || 'exports/灯会河畔-3D夜游-1080P-无声.mp4');
const fps = Number(process.env.VIDEO_FPS || 30);
const seconds = Number(process.env.VIDEO_SECONDS || 20);
const start = Number(process.env.VIDEO_START || 0);
const width = Number(process.env.VIDEO_WIDTH || 1920);
const height = Number(process.env.VIDEO_HEIGHT || 1080);
const samplesOnly = process.argv.includes('--samples');
await mkdir(path.dirname(output), { recursive: true });
const sceneUrl = new URL(process.env.SCENE_URL || 'http://127.0.0.1:5173/');
sceneUrl.searchParams.set('capture', ''); sceneUrl.searchParams.set('t', '0');
const { browser, page, errors } = await openScene({ url: sceneUrl.href, width, height });
let encoder;
try {
  await page.getByRole('button', { name: '导览', exact: true }).click();
  if (samplesOnly) {
    const folder = path.join(path.dirname(output), '镜头审看');
    await mkdir(folder, { recursive: true });
    for (let t = 0; t < 48; t += 4) {
      const data = await page.evaluate(t => { window.__seek(t); return window.__capture(); }, t);
      await writeFile(path.join(folder, `${String(t).padStart(2, '0')}s.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
    console.log(`镜头样张：${folder}`);
  } else {
    encoder = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output], { stdio: ['pipe', 'ignore', 'pipe'] });
    let encoderError = '';
    encoder.stderr.on('data', chunk => { encoderError += chunk; });
    const finished = once(encoder, 'close');
    const count = Math.round(seconds * fps);
    for (let frame = 0; frame < count; frame++) {
      const t = start + frame / fps;
      const data = await page.evaluate(t => { window.__seek(t); return window.__capture(); }, t);
      if (!encoder.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await once(encoder.stdin, 'drain');
      if (frame % (fps * 2) === 0) console.log(`导出 ${frame}/${count} 帧`);
    }
    encoder.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(`视频编码失败：${encoderError}`);
    if (errors.length) throw new Error(errors.join('\n'));
    await writeFile(`${output}.json`, JSON.stringify({ width, height, fps, seconds, start, end: start + seconds, frames: count, assets: await page.evaluate(() => window.__ASSET_STATUS__), method: 'Real 3D scene rendered frame by frame with the existing 48-second tour; no interface overlay or cursor.' }, null, 2));
    console.log(`已完成：${output}`);
  }
} finally { if (encoder && encoder.exitCode === null) encoder.kill(); await browser.close(); }
