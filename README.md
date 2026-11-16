# 真实感开关（zhenshi-kaiguan）

一个给编程助手用的 skill：用纯代码做出看着像拍出来的 3D 画面和视频。不用任何图像或视频生成模型，也不用 Blender，一个 HTML 页面加一个 38 行的截图脚本。

**第二版（2026-11-16）**：第一版只管七个渲染开关。让 Opus 5.5 照着做了一列蒸汽火车，开关都写对了，画面却像摆在桌上的模型。第二版补了开关之外的四样：镜头（先交镜头设计，景深按真实镜头算）、尺度（真实尺寸、倒角、参照物）、运动（动画十二法则落到时间函数上）、检查（规格表和灰模两道闸门，全开后的「玩具检查」）。

它把「看着真」拆成七个可以单独开关的渲染手法，让模型一级一级写、一级一级截图自检：

| 级别 | 打开了什么 |
|---|---|
| 0 | 平涂，只有颜色 |
| 1 | 直射光和硬阴影 |
| 2 | 程序化贴图（颜色变化、法线起伏、粗糙度变化） |
| 3 | 环境光和反射 |
| 4 | 软阴影和接触阴影 |
| 5 | 景深 |
| 6 | 运动模糊 |
| 7 | 色调映射、调色、暗角、颗粒 |

室外场景在 4 和 5 之间多一级「空气」。

带三个可以直接打开的示例场景，每个都能用 `?level=N` 逐级开关：

- `kit/index.html`：桌面静物
- `kit/lake.html`：群山之间的湖（地形在加载时烘焙成高度图）
- `kit/mech.html`：废墟城市和一台机甲（全部是距离场）

## 需要什么

- Node.js 18 以上
- ffmpeg
- Google Chrome（脚本用系统里装的 Chrome，不会另外下载浏览器）
- 一块能跑 WebGL2 的显卡。只在 Apple 芯片的 Mac 上验证过；Windows 上要把 `render.mjs` 里的 `--use-angle=metal` 换成 `--use-angle=d3d11`，我没试过。

## 先看一眼示例

```bash
cd kit
npm i
mkdir -p check
sh sheet.sh index.html check/levels.jpg 2 8 0 1 2 3 4 5 6 7
```

打开 `check/levels.jpg`，是同一时刻八个级别的对比。也可以直接双击 `index.html` 在浏览器里看它逐级打开。

渲之前先算镜头（第二版新增）：

```bash
node lens.mjs --mm 35 --f 5.6 --focus 19 --near 4
```

渲一段视频：

```bash
node render.mjs --page lake.html --fps 24 --size 1920x1080 --q "ns=16" --out out/lake.mp4
```

## 当成 skill 用

- **Claude Code**：把整个文件夹放到 `~/.claude/skills/zhenshi-kaiguan/`，然后说「用真实感开关做一段某某场景」。
- **别的编程助手**（Codex、Cursor 等）：让它先读 `SKILL.md` 和 `references/`，或者把 `kit/` 复制到一个空目录，把 `references/提示词.md` 里那段发给它。

这份 skill 不依赖某一个模型的专有功能，只要求助手能读写文件、运行 `node`、打开图片看。

## 它不管什么

声音、分镜、多镜头剪辑、字幕都不在范围里。真人、手、布料、头发做不好。

## 第一版和第二版，同一句话的实测

2026-11-15 和 11-16，在 Claude Code 里用 Opus 5.5（默认的思考强度），敲的是同一句话：「用真实感开关做一段：清晨的雪原，一列蒸汽火车开过铁桥，太阳从左后方低低照过来，镜头贴着近处的电线杆横移，车轮、连杆和烟都在动。时长 8 秒。」

| | 第一版 skill | 第二版 skill |
|---|---|---|
| 镜头 | 约 28 毫米，光圈口径 80 毫米（相当于 f/0.35） | 50 毫米，f/8，口径 6.3 毫米 |
| 机位 | 正侧面平拍 | 和列车成 31 到 36 度，跟拍 |
| 车速 | 每秒 5.5 米，后来它自己降到 2.5 | 每秒 22 米上下 |
| 非驱动轮 | 实心圆盘 | 有辐条 |
| 前景电线杆 | 在画面正中挡了三秒 | 每次 0.24 秒划过，避开了关键时刻 |
| 按 API 价折算（Claude Code 的 `/cost`） | 5.48 美元（含一次返工） | 18.61 美元 |
| 出片每帧（1080p、24 采样） | 6.8 到 8.8 秒 | 17.8 秒 |

第二版仍然不够好的地方：背景是平地上撒着一样的圆锥树，说好的深谷看不出深度；机车只占画面高的 22%，规格表写的是 36%；前景的电线从车头上横着切过去。这三条已经写回文档（`references/场景搭建.md`、`references/镜头.md`），但还没有再跑一次验证。

只测了这一个题材、各一次。别的题材、别的模型没有试过。

## 实测数字（Apple M3 Max，仅供参考）

| 场景 | 分辨率和采样 | 每帧 |
|---|---|---|
| 桌面静物 | 3840×2160，24 到 48 采样 | 0.9 到 1.4 秒 |
| 山湖 | 1920×1080，24 采样 | 1.3 到 2.2 秒 |
| 机甲城 | 1920×1080，12 采样 | 约 3.8 秒 |
| Opus 用第二版做的蒸汽火车 | 1920×1080，24 采样 | 约 17.8 秒 |

同一个时刻隔着别的帧渲两次，拼图里对应的两格像素完全相同（静物场景实测，命令见 `references/契约和自检.md`）。

换模型试过一次：只把这个文件夹交给 Claude Opus（通过 Claude Code 的子代理），让它新做一个「黄昏的海边灯塔」场景。它用了约 20 次工具调用做出了九个级别的对比图，并指出文档里 7 处照着做会出错的地方，这些地方已经改掉。别家的编程助手没有试过。

## 来历

这套做法是从公开的纯代码动画作品里归纳出来的，主要参考了这些仓库的源码和文档：
[room-at-dawn](https://github.com/Leonxlnx/room-at-dawn)、[thousand-peaks](https://github.com/0xCodez/thousand-peaks)、[clearwater](https://github.com/Aureliengmz/clearwater)、[blackout](https://github.com/anstapnever/blackout)、[PDoomVideo](https://github.com/JohnHeibel/PDoomVideo)、[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)、[hyperframes](https://github.com/heygen-com/hyperframes)。
这里没有复制它们的代码，三个示例场景是重新写的。

第二版另外读了这些仓库的文档和源码：[claude-threejs-photoreal](https://github.com/ammosu/claude-threejs-photoreal)、[shader-skills](https://github.com/gokayfem/shader-skills)、[Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills)、[vargHQ/skills](https://github.com/vargHQ/skills)、[the-big-one](https://github.com/makerjackie/the-big-one) 等，各自学了什么写在 `references/别人怎么做的.md`。镜头和运动两份的依据是 Held 等人 2010 年关于虚化和大小感的论文、Lasseter 1987 年把动画法则用到 3D 的论文，以及几本摄影教材的转述，出处列在各文档末尾。

## English

A skill for coding agents: make photoreal-looking 3D frames and video with code only (one HTML page plus a 38-line frame-capture script, no image or video generation models). Version 2 adds a shot-design step (lens in mm and f-number, aperture computed from them), a clay-render gate, motion rules based on the twelve principles of animation, and a "toy check". It breaks "looks real" into seven switches — direct light, procedural textures, ambient light and reflection, soft and contact shadows, depth of field, motion blur, tone mapping and grain (plus "air" for outdoor scenes) — and has the agent turn them on one at a time, checking a contact sheet after each. Three example scenes are included. Docs are in Chinese.

## 许可证

MIT，见 `LICENSE`。
