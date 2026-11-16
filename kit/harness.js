// 三个场景共用的外壳：读参数、编译着色器、可选的「加载时烘焙」、分条绘制、暴露 window.render(t)。
// 页面先设 window.SCENE = { FS, NAMES, BAKE（可选，烘焙高度图的片元着色器）, BAKE_SIZE, SEG }，再加载本文件。
// 画面 = 时间的纯函数：render(t) 只依赖 t，不用 Date.now()、不用无种子随机、不保留上一帧状态。
// 参数：?level=N 固定某一级；不带 level 时按时间逐级打开。?ns=每像素采样数。?label=0 去掉左下角的字。
//      ?clay=1 灰模（着色器里声明 uniform float CLAY，自己把材质换成中灰、关掉景深）。?debug=N 调试视图（uniform int DBG）。?tiles=、?tx= 分块数。
(function () {
  const S = window.SCENE, Q = new URLSearchParams(location.search);
  const NS = +(Q.get('ns') || 4), FIXED = Q.has('level') ? +Q.get('level') : -1, SHOWLAB = Q.get('label') !== '0';
  const NL = S.NAMES.length, SEG = S.SEG || 2.6, WIPE = 0.8, TAIL = 3.0;
  const c = document.getElementById('c'); c.width = innerWidth; c.height = innerHeight; window.FIXED_LEVEL = FIXED;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  const VS = `#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const bind = (p) => { gl.useProgram(p); const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); };
  const HEAD = `#version 300 es\nprecision highp float; precision highp int;\n`;
  // ---- 加载时烘焙：把高度场渲进一张浮点贴图，之后每一帧只查表
  if (S.BAKE) {
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('需要 EXT_color_buffer_float');
    const lin = !!gl.getExtension('OES_texture_float_linear'), sz = S.BAKE_SIZE || 2048;
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32F, sz, sz);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, lin ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const bp = prog(HEAD + S.BAKE); bind(bp); gl.uniform1f(gl.getUniformLocation(bp, 'SZ'), sz);
    gl.viewport(0, 0, sz, sz); gl.enable(gl.SCISSOR_TEST);
    for (let i = 0; i < 16; i++) { gl.scissor(0, sz * i / 16, sz, sz / 16); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish(); }
    gl.disable(gl.SCISSOR_TEST); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    S.FS = (lin ? '' : '#define MANUAL_BILINEAR\n') + `const float HMSZ = ${sz}.;\n` + S.FS;
  }
  const pr = prog(HEAD + S.FS); bind(pr);
  const ulocs = {}; const U = (n) => (n in ulocs ? ulocs[n] : (ulocs[n] = gl.getUniformLocation(pr, n)));
  // ---- 贴进场景里的画布（墙上的讲解板、桌上的纸）：每帧先用 2D 画布画好，再当贴图传给着色器，所以它们会吃到场景里的光、影子、景深和颗粒
  const decals = (S.decals || []).map((d, i) => { const cv = document.createElement('canvas'); cv.width = d.w; cv.height = d.h; const ctx = cv.getContext('2d');
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, d.w, d.h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { ...d, cv, ctx, tex, unit: 1 + i, key: null }; });
  const setU = (name, v) => { const l = U(name); if (l === null) return;
    if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); else gl.uniform1fv(l, v); };
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  window.DUR = S.DUR || (FIXED >= 0 ? (S.DUR_FIXED || 4) : SEG * NL + TAIL);
  window.levelAt = (t) => {                              // 时间 → 当前级别、上一级、擦除位置（0..1）
    if (FIXED >= 0) return { a: FIXED, b: FIXED, w: 0 };
    const k = Math.min(NL - 1, Math.floor(t / SEG)), local = t - k * SEG;
    return k === 0 ? { a: 0, b: 0, w: 0 } : { a: k - 1, b: k, w: ease(local / WIPE) };
  };
  const TILES = +(Q.get('tiles') || S.TILES || 24), TX = +(Q.get('tx') || S.TX || 1);
  window.render = (t) => {
    const lv = (S.cue || levelAt)(t);
    for (const d of decals) { const key = d.draw(d.ctx, t, d.cv);                 // draw 返回一个「内容指纹」，没变就不重传
      if (key !== d.key) { d.key = key; gl.activeTexture(gl.TEXTURE0 + d.unit); gl.bindTexture(gl.TEXTURE_2D, d.tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, d.cv); }
      gl.uniform1i(U(d.name), d.unit); }
    if (lv.u) for (const k in lv.u) setU(k, lv.u[k]);
    gl.viewport(0, 0, c.width, c.height);
    gl.uniform2f(U('R'), c.width, c.height); gl.uniform1f(U('T'), lv.ts === undefined ? t : lv.ts);
    gl.uniform1f(U('LA'), lv.a); gl.uniform1f(U('LB'), lv.b); gl.uniform1f(U('W'), lv.wpx !== undefined ? lv.wpx : lv.w >= 1 ? c.width + 9 : lv.w * c.width);
    gl.uniform1f(U('CLAY'), +(Q.get('clay') || 0)); gl.uniform1i(U('DBG'), +(Q.get('debug') || 0));   // ?clay=1 灰模，?debug=N 调试视图；着色器里没声明这两个 uniform 就不起作用
    gl.uniform1f(U('FR'), Math.round(t * 24) % 4096); gl.uniform1i(U('NS'), lv.ns || NS); if (S.BAKE) gl.uniform1i(U('HM'), 0);
    gl.enable(gl.SCISSOR_TEST);                          // 分条画，避免单次绘制太久被显卡看门狗打断
    for (let i = 0; i < TILES; i++) for (let j = 0; j < TX; j++) { const y0 = Math.floor(c.height * i / TILES), y1 = Math.floor(c.height * (i + 1) / TILES), x0 = Math.floor(c.width * j / TX), x1 = Math.floor(c.width * (j + 1) / TX);
      gl.scissor(x0, y0, x1 - x0, y1 - y0); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish(); }
    if (gl.isContextLost()) throw new Error('显卡上下文丢了：把 tiles 调大');
    gl.disable(gl.SCISSOR_TEST);
    if (S.overlay) S.overlay(t, lv);
    const lab = document.getElementById('lab'); if (!lab) return;
    if (S.overlay) { lab.style.display = 'none'; return; }
    lab.style.display = SHOWLAB ? 'flex' : 'none';
    document.getElementById('num').textContent = String(lv.b).padStart(2, '0');
    document.getElementById('txt').textContent = S.NAMES[lv.b];
  };
  if (S.ready) S.ready.then(() => { window.READY = true; }); else window.READY = true;      // 有要预先加载的图片就等它们
  if (!location.search.includes('render')) { const t0 = performance.now(); (function loop() { render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); })(); }
})();
