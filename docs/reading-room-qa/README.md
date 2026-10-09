# 庭中阅览模块

`assets/reading-room.js` 与 `assets/reading-room.css` 为独立、无依赖的文字阅读层。宿主页负责加载两个文件，并暂停/恢复三维运动。

```js
const reader = CourtyardReading.install({
  manifestUrl: 'assets/readings/index.json',
  entries: [{ title: '作品名', url: 'https://example.com/' }],
  onOpen(index) {},
  onClose(index) {},
  onSection(index, section, reading) {},
  onVisit(index, reading) {}
});
await reader.open(0, 'chapter-id');
reader.close();
```

`open()` 返回 Promise<boolean>：成功呈现为 true，失败、无效编号或被更新请求取代为 false。`isOpen` 反映弹层状态；`currentIndex` 为最近打开的建筑编号，初始为 null。`onSection` 的 section 在无篇章时为 null。`onVisit` 只在通过校验的文本实际呈现后调用，不代表用户读完。重复 install 返回同一实例。

清单支持 `{entries:[{index,path}]}` 或编号到文件路径的映射。正文文件必须在清单同一目录内，且为本站 `.json` 文件，可附带经过验证的内容哈希查询参数。路径相对清单地址解析。失败可重试；不会预取正文；成功正文在本次页面会话中缓存。新请求和关闭都会终止旧请求，过时结果不能更新弹层。

正文明确使用 coverage 字段：`full-text`、`privacy-edited`、`anonymized`、`excerpt`、`summary`、`entrance-only`；未知范围绝不据正文存在而推断全文。正文、标题、表格均按文本节点呈现；来源链接仅允许不含账号密码的绝对 HTTPS 地址。

可选 attribution 为署名。provenance 中 publicPage、sourceFile、publicTextAttribution、sourceLiveTextMatch 用于收录说明；不把仓库哈希等技术字段展示为正文。coverageNotes 收在默认折叠的「收录与来源」中，summary 标为「导读」。

表格使用 `tables:[{caption, columns:[字符串], rows:[[字符串]], afterParagraphIndex:0}]`。可选 afterParagraphIndex 指定放在第几个段落后（从零开始）；未指定时排在正文后。窄屏表格独立横向滚动。

弹层使用原生 dialog，带旧环境 inert 回退、焦点恢复/循环、Esc、键盘事件隔离和浏览器返回/前进。宿主 onOpen 仍须清除已按下的移动键、暂停移动；onClose 先恢复宿主 UI，模块随后恢复入口焦点。

## 已执行的检查

```sh
node --check assets/reading-room.js
node docs/reading-room-qa/reading-room-check.cjs
```

纯 Node 检查覆盖来源 HTTPS 校验、本站静态 JSON 范围、清单结构、正文/建筑编号一致性、章节重复、表格结构、署名/来源与显式收录范围。测试不会启动浏览器。

## 浏览器行为检查

通过本地站点打开 `docs/reading-room-qa/reader-fixture.html?run`，页面会显示每项结果。资料由页面内固定 JSON 模拟；不访问原站。该检查覆盖加载竞争、加载中关闭、快速重开、返回/前进、焦点恢复、移动按键隔离、跨章节/表格搜索、HTML 文本处理、错误与登录入口状态。手动使用「打开示例阅览」检查桌面、390px/320px 窄屏、横屏、Tab 循环、正文滚动和表格横向滚动。

浏览器实测结果由使用受支持浏览器工具的整体验证负责记录；纯 Node 通过不等于浏览器行为已经通过。
