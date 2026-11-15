// 逐帧渲染：node render.mjs [--page index.html] [--fps 30] [--size 1920x1080] [--from 0] [--to <秒>] [--audio a.wav] [--out out.mp4]
//          node render.mjs --sheet 0.5,1,1.5,2 [--cols 3] [--w 640] [--out sheet.jpg]   抽几帧拼成一张图，给模型自己看（--w 是每格的宽度）
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const fps = +opt('fps', 30), [w, h] = opt('size', '1920x1080').split('x').map(Number);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--hide-scrollbars', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.resolve(opt('page', 'index.html'))).href + '?render' + (opt('q') ? '&' + opt('q') : ''));
await page.waitForFunction('window.READY === true');
const DUR = await page.evaluate(() => window.DUR);
const shot = async (t) => { await page.evaluate(t => window.render(t), t); return page.screenshot({ type: 'jpeg', quality: 95 }); };
if (opt('sheet')) {
  const ts = opt('sheet').split(',').map(Number), dir = fs.mkdtempSync('sheet-');
  for (let i = 0; i < ts.length; i++) fs.writeFileSync(`${dir}/${String(i).padStart(3, '0')}.jpg`, await shot(ts[i]));
  const cols = Math.min(+opt("cols", 3), ts.length), rows = Math.ceil(ts.length / cols), out = opt('out', 'sheet.jpg');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/%03d.jpg`, '-vf', `scale=${opt('w', 640)}:-1,tile=${cols}x${rows}`, '-frames:v', '1', out]);
  fs.rmSync(dir, { recursive: true }); console.log('wrote', out);
} else {
  const from = +opt('from', 0), to = +opt('to', DUR), out = opt('out', 'out.mp4'), audio = opt('audio');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(audio ? ['-ss', String(from), '-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    ...(audio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps), t0 = Date.now();
  for (let i = n0; i < n1; i++) {                       // 第 i 帧永远是 render(i / fps)，和机器快慢无关
    const buf = await shot(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`wrote ${out}: ${n1 - n0} frames, ${((Date.now() - t0) / (n1 - n0)).toFixed(0)} ms/frame`);
}
await browser.close();
