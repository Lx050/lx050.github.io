# 数字庭院逐馆精修：本轮覆盖与验收范围

本轮按编号0—25核对：25座普通馆采用实际Blender网格增强，23号蝴蝶采用独立强化装配。以下按最终生产加载顺序实测挂载，不以旧模型文件存在代替接入。月雪采用后加载的实际花园，旧文学馆版本不重新启用；基础设施编号属于另一个命名空间。

## 最终覆盖表

| Index | Actual title | Final builder | Asset(s) | Attach/creation hook | Expected group | Count |
|---:|---|---|---|---|---|---:|
| 0 | 墨息 | `assets/content-creation-care.js` | `assets/ink-detail.js` | `CourtyardInkDetail.attach(b)` | `ink-blender-static` | 1 |
| 1 | 画韵新生 | `assets/content-creation-care.js` | `assets/huayun-detail.js` | `CourtyardHuayunDetail.attach(b)` | `huayun-blender-static` | 1 |
| 2 | 画韵新生·旧址 | `assets/content-creation-care.js` | `assets/alternate-detail.js` | `CourtyardAlternateDetail.attach(b)` | `alternate-blender-static` | 1 |
| 3 | 墨生 | `assets/content-creation-care.js` | `assets/restoration-detail.js` | `CourtyardRestorationDetail.attach(b)` | `restoration-blender-static` | 1 |
| 4 | 暖聆 | `assets/content-creation-care.js` | `assets/nuanling-detail.js` | `CourtyardNuanlingDetail.attach(b)` | `nuanling-blender-joinery` | 1 |
| 5 | 暖聆App | `assets/content-creation-care.js` | `assets/nuanling-app-detail.js` | `CourtyardNuanlingAppDetail.attach(b)` | `nuanling-app-blender-detail` | 1 |
| 6 | 排版助手 | `assets/content-creation-care.js` | `assets/editor-detail.js` | `CourtyardEditorDetail.attach(b)` | `editor-blender-static` | 1 |
| 7 | 金陵专利局 | `assets/content-services.js` | `assets/shield-detail.js` | `CourtyardShieldDetail.attach(b)` | `shield-blender-static` | 1 |
| 8 | RSS | `assets/architecture.js` | `assets/rss-detail.js` | `CourtyardRSSDetail.attach(b)` | `rss-blender-static` | 1 |
| 9 | Vaultwarden | `assets/architecture.js` | `assets/vault-detail.js` | `CourtyardVaultDetail.attach(b)` | `vault-blender-static` | 1 |
| 10 | API | `assets/content-services.js` | `assets/gateway-detail.js` | `CourtyardGatewayDetail.attach(b)` | `gateway-blender-static` | 1 |
| 11 | 标书 | `assets/architecture.js` | `assets/dossier-detail.js` | `CourtyardDossierDetail.attach(b)` | `dossier-blender-static` | 1 |
| 12 | Reme | `assets/content-services.js` | `assets/reme-detail.js` | `CourtyardRemeDetail.attach(b)` | `reme-blender-static` | 1 |
| 13 | AI两年 | `assets/content-narratives.js` | `assets/session-detail.js` | `CourtyardSessionDetail.attach(b)` | `session-blender-static` | 1 |
| 14 | 凝结核列传 | `assets/content-narratives.js` | `assets/portraits-detail.js` | `CourtyardPortraitsDetail.attach(b)` | `portraits-blender-static` | 1 |
| 15 | 从因到果 | `assets/content-narratives.js` | `assets/causal-detail.js` | `CourtyardCausalDetail.attach(b)` | `causal-blender-static` | 1 |
| 16 | 哭泣的城市 | `assets/content-narratives.js` | `assets/city-detail.js` | `CourtyardCityDetail.attach(b)` | `city-blender-static` | 1 |
| 17 | 双星记 | `assets/content-narratives.js` | `assets/twinstars-detail.js` | `CourtyardTwinstarsDetail.attach(b)` | `twinstars-blender-static` | 1 |
| 18 | 思想者的五个版本 | `assets/content-narratives.js` | `assets/versions-detail.js` | `CourtyardVersionsDetail.attach(b)` | `versions-blender-static` | 1 |
| 19 | 置身青媒内 | `assets/content-literary.js` | `assets/handover-detail.js` | `CourtyardHandoverDetail.attach(b)` | `handover-blender-static` | 1 |
| 20 | 月雪 | `assets/moon-snow-garden.js` | `assets/moonsnow-detail.js` | `CourtyardMoonsnowDetail.attach(b)` | `moonsnow-blender-static` | 1 |
| 21 | 清样之前 | `assets/content-literary.js` | `assets/proof-detail.js` | `CourtyardProofDetail.attach(b)` | `proof-blender-static` | 1 |
| 22 | 拓片 | `assets/content-literary.js` | `assets/rubbing-detail.js` | `CourtyardRubbingDetail.attach(b)` | `rubbing-blender-static` | 1 |
| 23 | 未上色的蝴蝶 | `index.html: prepareButterflySea + installRoofMechanism` | `assets/butterfly-crown.js`, `assets/butterfly-flight.js`, `assets/content-butterfly.js` | `CourtyardButterflyCrown.build(THREE,b,material) + CourtyardButterflyFlight.create() + CourtyardButterflyContent.build(THREE,b,material)` | `suspended-butterfly-crown` | 1 |
| 24 | MindCareAI | `assets/content-services.js` | `assets/mindcare-detail.js` | `CourtyardMindcareDetail.attach(b)` | `mindcare-blender-static` | 1 |
| 25 | GitHub | `assets/content-literary.js` | `assets/workshop-detail.js` | `CourtyardWorkshopDetail.attach(b)` | `workshop-blender-static` | 1 |

表中名称保留实际导航标题，11号“标书”对应阅读中的知虾标书，25号“GitHub”对应公开项目工坊。每个普通馆的主精修组与蝴蝶冠组均应只出现一次。模型生成脚本及离线审阅图随仓库保留，可编辑源留在各馆本地QA目录，不提交大型.blend。

## 边界与未验证项

- 完成的是逐馆几何细化、内容对应、实际加载与云端CPU回归；最终发布状态以对应提交的Pages部署结果为准
- 未进行浏览器/WebGL交互、移动设备或实测GPU帧率验收；离线Blender图不是网页截图
- 三角面和批次是装配预算，不是实际每帧draw calls；视锥、阴影、反射、后处理、场景装饰和阅读面板会改变帧成本
- Canvas文字像素不烘焙进离线模型，内嵌正文与绘制调用由专门回归检查
- RSS、Vaultwarden和知虾只保留公开入口材料，没有登录、读取私人内容或实现敏感功能
- 月雪匿名文本及来源隐藏策略保持；91个实例的1 mm铺地修复是唯一已单列的相关原模型差异
- 有限接合、闭合体与碰撞检测不构成实体结构、安全、医疗或产品功能认证
- 旧wave1导航哈希差异保持基线记录；Mac专用runner既未运行也未语法解析

## 后续性能机会（本轮不另行展开）

优先合批早期排版抽屉、双星屏风、因果通风件与五版本屏风的重复移动部件，再考虑月雪原有288颗高分段砾石的分级细节。现有远距次级部件LOD保留，不能通过隐藏主要建筑轮廓或阅读内容来虚报节省。本轮到11号馆和最终覆盖核对为止，不自动开启下一轮扩建。

## 最终装配预算

| 范围 | 三角面 | 材质批次 |
|---|---:|---:|
| 25普通馆新增Blender细部 | 154,596 | 145 |
| 25普通馆完整装配 | 547,770 | 1,199 |
| 23号蝴蝶基础强化装配 | 34,199 | 99 |
| 23号含原视点内容 | 34,439 | 104 |
| 全26处完整装配合计 | 582,209 | 1,303 |

细部资产合计9,611,485字节原始 / 1,036,320字节Node gzip-9。保留的远距次级部件LOD在全部目标超过距离阈值时，潜在减少7,568三角面 / 60批次；这不是实测帧率或固定每帧节省。上述完整装配合计不含后附阅读面板、反射副本、环境装饰、阴影额外pass和后处理。详见 `DETAIL_PERFORMANCE_BUDGET.md` 的逐栋数据与口径。

## 本轮收尾验收

最终65/65项CPU检查通过；127份JS/CJS、53份Python AST和42段HTML内联脚本语法通过，181项独立来源保全通过。434份源文件与10份模型/渲染产物冻结核对，执行期间只更新两份总结Markdown，最后单独刷新文档哈希。78项发布manifest与两入口各57项缓存版本一致，index.html与island.html逐字节一致。

全部25普通馆精修组各挂载一次，23号蝴蝶冠与原视点内容各挂载一次。前24馆模型与预算不因最后一馆而改变。最终证据集中在本地 `qa-results/dossier/` 的检查、回归、预算、manifest、确定性、渲染、像素审阅和完整性报告；本轮建模与云端验收至此收尾。
