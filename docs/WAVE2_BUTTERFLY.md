# WAVE 2A — 未上色的蝴蝶：可动纪念碑 +「心中万彩」显色范式

> 执行者：GPT-6（Codex）。本波把美学宪法③「心中万彩/显色律」与④「可动即语义」在**一个对象**上完整做透，
> 形成可复制到其余 26 座的通用机制。先读 `docs/WORLD_SCALE_BRIEF.md`、`docs/WAVE1_5_POLISH.md`、`docs/WAVE1_NOTES.md`、`docs/wave1-check.cjs`，通读当前 `index.html`。
> **纯 three.js r128 实现，不编辑 GLB 二进制、不调用 Blender、不新增任何网络依赖/纹理/音频。**
> 完成后提交一个**新 commit**（不要 push），同步 `island.html` 逐字节一致，更新 `docs/WAVE1_NOTES.md`（追加 Wave 2A 小节）。

## 0. 对象事实（已实测，禁止凭名字猜，动手前用脚本复核）
`assets/models/LM24_Butterfly.glb`，root 节点名 `Butterfly`，16 节点 / 15 mesh / 4 材质，**无 skin、无 animation**：
- 正面翅（象牙白 `ivory`，薄片在 XY 平面、法线沿 Z，**有 UV、无贴图、无顶点色**）：
  `WingLL`(11,左下) `WingLR`(12,右下) `WingUL`(13,左上) `WingUR`(14,右上)。
- 暗色背翅（`dark`）：`BackLL`(2) `BackLR`(3) `BackUL`(4) `BackUR`(5)，与正翅成对、在其 z±0.03。
- 身体：`Body`(7) `Head`(9,Icosphere,原 glow 材质) 触角 `AntL`(0)`AntR`(1)；装置/展框：`Base.010`(6,stone) `Panel`(10,stone,约1.4×1.65 大板) `FrameTop`(8,dark)。
- 翅膀节点自带 translation（翅中心 x≈±0.26~0.30、y≈0.93~1.40）与初始绕 Y 微张（±0.19~0.21 rad）。根 `Butterfly`(15) 竖直（身体沿 +Y）。
- 加载链：`glbPerEntry[23]` → 额外 `rotation.y+=π/2` → `glbRefine` 会把材质**按名替换成共享的 `M.ivory/M.dark/M.stone`，glow 被换成 `lm.glow`**；随后 `placeMonument`（targetHeight=50，tier='major'）克隆材质并整体夜色化（非发光 color×.34），再 `dressMonument` 贴通用建筑线脚。
- entry#23：title「未上色的蝴蝶」，desc「为尚未上色的故事，留一点想象。」，url `https://uncolored-butterfly.maniforld.com`。
- 现成可用：每帧 `lm.activation`（nearest 时 0→1 指数平滑，离开→0）、统一 `frame()` 循环、`WORLD`、bloom(threshold 2.8/strength .18)、相机 `monumentView/clearCamera`、`lm.bounds`（相机碰撞与 LOD 依据）、`updateLandmarks` 内遍历 body 设 emissive 的循环。

## 1. 专属纪念碑化（去掉"楼房"语义）
蝴蝶**不得**被通用 `dressMonument` 的窗格/壁柱/腰线包裹。为它引入专属呈现路径（例如 tier `'butterfly'` 跳过 face-trim，仅保留克制台座），并强化其本意——**一面巨大的「留白画壁/空展框」+ 一只在壁前的活蝶**：
- 原生 `Panel`/`FrameTop`/`Base` 放大后就是"未上色的空白画板"。把 Panel 处理成素净留白画壁：暖灰/绢白偏暗的纸面、极窄深色边框，**不加任何建筑线脚/窗格**；可在画壁边缘做一道很弱的暖光轮廓，暗示"等待上色"。
- 蝴蝶停驻于画壁前方/中央的视觉重心，构图在参道中轴上成立（参道、台阶、台地沿用 Wave1，不重做）。
- 头部那点暖光保留为"一点灯"，克制、不爆白。
- 远 LOD（`monumentLOD`）对蝴蝶改为可辨识的**蝶形/双翅深色剪影 + 顶部一点暖光**，不要用通用方盒。
- 美学红线：东方写意、纪念碑谷式留白；**禁止**彩虹铺满、高饱和卡通、楼房壁柱窗格、廉价发光板、整面爆白。

## 2. 铰接扇翅（可动即语义）
- 在每侧翅根（贴身体、y 取该侧上下翅之间，**先用脚本实测翅膀 bbox 再定铰链坐标**）建立铰链 Group，用 `hinge.attach(mesh)`（保持世界变换）把同侧 `WingUL+WingLL`(+对应 `BackUL+BackLL`) 归入左铰链、右侧归右铰链。
- 开合轴以实测视觉为准（翅面法线沿 Z、初始微张是绕 Y，预期主开合绕身体竖直轴 Y；若 attach 后轴向不符，用包裹 Group 修正到正确铰链轴），左右镜像。
- 动画要有**呼吸感而非匀速**：远景/无人时极慢、小幅度地扇动（像梦中活物，可有较长停顿）；玩家靠近（activation 上升）时扇翅幅度与频率明朗化；与第 3 节显色在同一节奏上推进。自己给出周期/幅度/缓动并在 NOTES 记录。
- 触角可随扇翅极轻微颤动（可选，克制）。

## 3. 心中万彩显色 shader（本波核心，做成可复用机制）
- 仅对 4 片**正面翅**替换为蝴蝶专属材质：优先 `MeshStandardMaterial` + `onBeforeCompile`（保留 r128 方向光/夜色/投影一致性），**不要改共享的 `M.ivory`**（其他地标在用）。背翅保持深色半透衬底。
- uniforms（至少）：`uReveal`(0..1 显色进度)、`uTime`、`uVisited`(0..1)、`uNight`(昼夜，接现有天时)。
- 片元表现：
  1. **常态素墨**：uReveal=0 时翅膀是夜色里的暖灰/象牙素绢（低饱和、微透），即"未上色"。
  2. **翅脉与鳞粉**：用已有 UV 做**纯程序化、无贴图**的翅脉（数条沿脉向、由翅根发散的细线）与细碎鳞粉（廉价 hash/梯度噪声，控制片元指令预算）。
  3. **万彩生长**：uReveal 上升时，颜色**沿翅脉由翅根向翅尖、由脉向两侧**生长出来；色相场取东方色（黛青/朱砂/藤黄/石绿/紫等，自行调和为雅致的有限色板，随 uv 与 uTime 极缓慢流动），鳞粉被逐点点亮；uReveal 回落时按相反节奏**褪回素墨**（"颜色出现与消失"）。
  4. 发光只允许出现在**翅脉细线/鳞粉点**上（emissive，受 bloom threshold 约束），**禁止大面积成片发光或近白**；夜晚显色更明显，白天淡化为纸面彩色。
  5. 访问过（visited，localStorage `garden-visited-v1` 已含该 url）后，即使离开也保留一抹极淡余色（uVisited），作为"曾经点亮"。
- 驱动：在帧循环（可新增 `updateButterfly(dt,lm)` 并于 `updateLandmarks` 后调用）里，用 `lm.activation`、`elapsed`、visited、天时平滑求 uReveal 与扇翅参数；远距离/LOD 切到剪影时可跳过翅材质 uniform 更新以省性能。
- **可复用**：把"铰链扇动"和"显色材质/进度"抽成通用小工具（如 `createHinge(root,partNames,pivot,axis)`、`makeRevealWingMaterial(opts)`、一个按 activation/visited/天时驱动 reveal 的小控制器），后续 26 座可复用；但本波只在蝴蝶完整接线，其余建筑表现保持不变。

## 4. bounds / 相机 / 交互
- 扇动会扩大占地：`lm.bounds` 必须取**扇动极限姿态**的静态并集 AABB（放置后手动按最大翅展扩展，或在铰链最大角时 `Box3.setFromObject` 一次），**不要每帧重算**；保证 `monumentView/clearCamera/subjectBounds`、最近观赏距离、LOD 都据此正确，任何姿态不穿模、视线不被翅/画壁拦截。
- entry 交互卡、`#enter-link`（新窗口打开 uncolored-butterfly）、访问计数、目录、小地图、七桥、昼夜、BGM 等既有行为全部不变。

## 5. 自动验收（扩展 docs/wave1-check.cjs，必须全绿）
- 结构：左右铰链存在；4 正翅材质为专属材质且含 `uReveal/uTime`；共享 `M.ivory` 未被污染（其他地标抽样颜色不变）。
- 扇动：播放若干帧后铰链角随时间变化且左右镜像、幅度落在设定区间；无人时为小幅慢扇。
- 显色：远距离/未靠近时 uReveal≈0 且翅膀像素近无彩色（饱和度低）；`teleport` 到 #23 entryPoint 并等待 activation 收敛后 uReveal>0.6，翅面出现**非灰彩色**（渲染读像素，HSV 饱和度显著上升）且近白像素占比不超过既有过曝阈值（翅脉发光不成片）；离开后 uReveal 回落向 0。
- bounds：在最大扇动姿态采样翅膀世界顶点，全部被 `lm.bounds` 包含；相机审计对 #23 仍 inside=[]/blocked=[]/fits=true（桌面与 390×844）。
- 回归：0 console/page error、34/34 GLB、其余 25 座与三数学岛表现不变、桌面 ≥55fps 与移动模拟 ≥30fps 且不触发 qualityReduced、无横向溢出；交互/计数持久化/目录/昼夜/换曲/七桥/WebGL-lost 兜底全通过；`index.html===island.html`。
- 固定机位截图（桌面 + 移动，输出到新目录如 `/tmp/wave2-qa`）：远景蝶形剪影、参道仰望（留白画壁+蝶）、最近观赏·显色高潮（要清楚看到翅脉万彩）、离开后褪色；并出 report.json。

## 6. 禁改 / 交付
- 不改 `vendor/ assets/ garden.html editorial.html CNAME`，不加网络依赖；不 push。
- 提交新 commit，index/island 逐字节一致，NOTES 追加参数、铰链坐标求法、色板、断言与截图结果、遗留（真实翅脉几何/更精细鳞粉与专属子世界留待 Blender/Wave2B）。
