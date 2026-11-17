# 更新记录

版本号按 [语义化版本](https://semver.org/lang/zh-CN/)：大版本是做法变了，补丁版本只改文档或修小错。每个版本在 GitHub 上有对应的标签和 Release。

## v2.0.1（2026-11-17）

只改文档，skill 本身（`SKILL.md`、`references/`、`kit/`）和 v2.0.0 一字不差。

- README 加了第二版的三次实测：沙漠、雪原火车（验证 v2.0.0 里写回的三条）、雪山，各自的花费、做到了的和还不够好的。
- 新增这份更新记录，给三个版本打了标签。

## v2.0.0（2026-11-16）

第一版只管七个渲染开关，做出来的火车像摆在桌上的模型。第二版补开关之外的四样：

- **镜头**：写代码之前先交镜头设计；景深按真实镜头的焦距和光圈值算（新增 `kit/lens.mjs`），不再直接填光圈大小。
- **尺度**：规格表写真实尺寸、部件、倒角，画面里要有观众知道大小的东西；环境不能是白板；主体占画面的比例要对上规格表。
- **运动**：动画十二法则落到时间函数上；会转的部件要有看得出在转的记号；硬的东西不许像果冻。
- **检查**：规格表和灰模两道闸门；逐级拼图自检；至少三轮返工；全开后的九问「玩具检查」；条件允许时请一个只看图的助手审图。
- 新增 `references/镜头.md`、`references/运动.md`、`references/场景搭建.md`、`references/别人怎么做的.md`；三个示例的光圈改成按镜头算。

## v1.0.0（2026-11-15）

- 七个开关（直射光、程序化贴图、环境光和反射、软阴影、景深、运动模糊、色调映射和颗粒，室外加「空气」），一级一级写、一级一级截图自检。
- 契约（画面是时间的纯函数）、拼图自检、截图脚本、三个示例场景。

---

# Changelog (English)

- **v2.0.1** (2026-11-17) — Docs only: README now reports three more Opus 5.5 test runs with version 2 (desert rally car, the same steam-train prompt as before, a snowy ridge at sunrise), including what still looks fake. Added this changelog and version tags.
- **v2.0.0** (2026-11-16) — Adds a shot-design step with depth of field computed from real lens values (`kit/lens.mjs`), real-world scale rules, motion rules based on the twelve principles of animation, spec-sheet and clay-render gates, at least three rework rounds and a "toy check".
- **v1.0.0** (2026-11-15) — Seven render switches turned on one at a time with contact-sheet self-checks; three example scenes.
