# Maniforld 数字庭院：全建筑重建版

这是可直接运行的完整项目。线上发布状态以 GitHub Pages 的部署记录为准。

## 启动

在解压后的目录中运行：

    python3 -m http.server 8874

浏览器打开 http://localhost:8874/ 。需要支持 WebGL 的浏览器。不要直接双击 HTML 文件，否则浏览器可能拦截模型资源。

## 本次内容

- 25 座功能建筑重新建模，保留各自用途，补齐可穿行室内、结构、材料与连接件
- 3 座数学岛馆、庭门和七桥的构造深化
- 26 个可操作的侧窗 / 天窗构件；靠近后使用开启、半开、收合按钮
- 地面直达，不恢复高台；WASD / 方向键行走，Shift 跑步，空格跳跃，拖动环顾
- 保留两级机械蝶翼、展开 / 半收 / 收拢 / 骨架控制，以及 E 进入和返回的内部生物蝴蝶长卷
- 保留全部外链、音乐、原有 GLB 和授权署名
- `index.html` 和 `island.html` 完全相同

代码基于线上 61f73927ce6c1d28dca3ca97bb554217d6ff6f77，再完整接入 23c6a71fa95d0812d8933faa671546eb2666d420 的导航和机械翼改进。

## 验证

纯源码 / 几何检查：

    node docs/architecture-static.cjs

浏览器测试和截图：

    python3 docs/preview-server.py

打开 http://localhost:8874/docs/architecture-qa.html ，分别运行桌面和窄屏测试。附加按钮检查 448 个屋顶 / 相机方向样本及真实构件按钮。此测试服务器仅监听 127.0.0.1；生成的证据写入 `qa-results/`。

交付的 JSON 结果、全部原始截图另存于验证材料包，图文报告提供建筑索引和测试结论。

## 实现与限制

新增模块：`assets/architecture.js`、`assets/infrastructure.js`、`assets/courtyard-runtime.js`。采用程序化几何、共享材质、重复件实例化、视锥剔除和近景细节层，未新增外部 CDN 或大体积模型依赖。

测试设备为云端 Chromium 软件渲染；没有在真实手机、Safari 或硬件 GPU 上验证帧率，不承诺 30/60 FPS。此版本为可交互艺术建筑，未验证结构承重、风荷载、液压或机械安全；既有蝶翼的运动检查不等于连续扫掠碰撞检测。
