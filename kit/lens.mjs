// 渲之前先把镜头算一遍：node lens.mjs --mm 35 --f 5.6 --focus 19 [--near 4] [--h 1080] [--sensor 20.25]
// --mm 全画幅焦距（毫米）  --f 光圈值  --focus 对焦距离（米）  --near 最近的前景物离镜头几米  --h 画面高度（像素）  --sensor 感光面高度（毫米，16:9 是 20.25）
// 场景要按米建模。打印出来的 FOVY、zoom、lensR 可以直接抄进着色器。
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? +a[i + 1] : d; };
const mm = opt('mm', 35), N = opt('f', 5.6), s = opt('focus', 20), near = opt('near', 0), H = opt('h', 1080), sh = opt('sensor', 20.25);
const f = mm / 1000, c = 0.029e-3;                                   // 容许弥散圆 0.029 毫米（全画幅常用值）
const fovy = 2 * Math.atan(sh / 2 / mm), D = f / N, hyper = f * f / (N * c) + f;
const dn = s * (hyper - f) / (hyper + s - 2 * f), df = s < hyper ? s * (hyper - f) / (hyper - s) : Infinity;
const px = (z) => D * Math.abs(1 / s - (z === Infinity ? 0 : 1 / z)) * H / (sh / mm);   // 距离 z 处的东西虚成多少像素（直径）
const r = (x, n = 2) => x === Infinity ? '无穷远' : x.toFixed(n);
console.log(`镜头：全画幅 ${mm} 毫米，f/${N}，对焦 ${s} 米（16:9 垂直视角 ${(fovy * 180 / Math.PI).toFixed(1)}°）`);
console.log(`抄进着色器：FOVY = ${fovy.toFixed(4)}   zoom = ${(1 / Math.tan(fovy / 2)).toFixed(3)}   lensR = ${(D / 2).toFixed(5)}（米）`);
console.log(`口径 ${(D * 1000).toFixed(1)} 毫米，是人眼瞳孔（4.6 毫米）的 ${(D / 0.0046).toFixed(1)} 倍`);
console.log(`超焦距 ${r(hyper, 1)} 米；景深从 ${r(dn, 1)} 米到 ${r(df, 1)}${df === Infinity ? '' : ' 米'}`);
console.log(`无穷远的背景虚 ${px(Infinity).toFixed(1)} 像素` + (near ? `；${near} 米处的前景虚 ${px(near).toFixed(1)} 像素` : '') + `（画面高 ${H} 像素）`);
const warn = [];
if (N < 1.4) warn.push('光圈值小于 1.4，真实的电影镜头很少这么亮。');
if (mm <= 60 && D / 0.0046 > 8) warn.push('口径超过瞳孔的 8 倍，60 毫米以下的真实镜头到不了这个数，画面容易被看成微缩模型。大东西用 f/5.6 以上，或者换长焦退远拍。');
if (s > hyper && px(Infinity) > 3) warn.push('对焦已经超过超焦距，背景却虚了 3 像素以上，检查单位是不是米。');
if (s >= 10 && mm <= 50 && N < 4) warn.push('十米以外的大东西用广角到标准镜头拍，建议 f/5.6 到 f/11。');
if (near && px(near) > 0.06 * H) warn.push(`前景虚成了 ${px(near).toFixed(0)} 像素，会认不出是什么。当边框用的前景要清楚；靠运动模糊去虚快速划过的前景。`);
console.log(warn.length ? '要注意：\n- ' + warn.join('\n- ') : '没有发现不合理的地方。');
