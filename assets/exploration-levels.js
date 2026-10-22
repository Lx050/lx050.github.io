/* Shared lightweight spatial exploration, not 26 bespoke puzzle games.
 * All phase labels and section IDs come from building-actions.js / reading-catalog.js;
 * source identities and claims come from docs/content-map.json. No network or DOM.
 * Reading is ALWAYS independent and unlocked. Public-entry-only levels (8, 9, 11)
 * are three exterior explanation stations, never demonstrations of protected tools.
 *
 * API: CourtyardExplorationLevels.{SPECS,makeStations,create,STORAGE_KEY,count}
 * const tracker = create({storage?,onChange?(snapshot,event)});
 * tracker.enter(indexOrSourceId,{width,depth,stations?});
 * tracker.observe({x,y:0,z}, {dt, facing:{x,z}, actionState});
 * // Building-local feet and horizontal camera forward; dt in foreground seconds.
 * // actionState is buildingActions.inspect(index), including its actual counts.
 * // An explicitly supplied null actionState means the untouched inspect result.
 * // Observe immediately after a successful apply with dt:0; frame ticks handle holds.
 * tracker.interact(0|1|2);    // authorizes one existing action at the current goal
 * tracker.exit(); tracker.retry(index?); tracker.reset(index?); tracker.progress(index?); tracker.all();
 * inspect is an alias for progress. enter returns a snapshot; interact returns
 * {ok,reason,progress}. Invalid input never advances. Completion requires physically
 * returning to entry after all three phase goals. The host applies the existing
 * building action ONLY after interact returns ok, then observes its actual state.
 * Missing action/facing/dt context NEVER bypasses a requirement. A stage can need
 * another press, a one-second sample, or two safe exterior viewpoints. The host
 * displays feedback.text / objectiveText and uses canInteract for its UI.
 * retry clears only the unfinished observation, preserving completed phases and
 * the actual exhibit state. It never moves the visitor or operates a source control.
 * feedback.code distinguishes distance, facing, holds, viewpoints and recovery;
 * interact retains its existing reason codes and includes the same useful feedback.
 * Authored instructions remain unmodified in SPECS and expected.sourceInstruction.
 * This module never locks reading.
 *
 * Completed phases survive exit/re-entry during this page session, not reload.
 * The unfinished phase restarts its short subgoal after exit, so free exhibit
 * operations or expired timers cannot leave an observation permanently blocked.
 * Successful completion alone persists by the original source URL. A completed
 * level can be replayed on re-entry; reset clears its local record, never content.
 * Default stations are outside the footprint, all on its front side. The host may
 * supply collision-checked {entry,left,right} overrides in the same coordinates.
 */
(function (global) {
  'use strict';
  const STORAGE_KEY = 'courtyard-exploration-completed-v1';
  const FRAMEWORK = '共同的轻量空间探索，含 8 座差异化示例：切换比照、播放控制、双视点、朝向和短暂停留。不是 26 套独立谜题；阅读始终开放。';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach(key => freeze(value[key])); Object.freeze(value);
    }
    return value;
  }
  const SOURCE_SPECS = freeze([{"index":0,"id":"https://moxi.maniforld.com","sourceUrl":"https://moxi.maniforld.com","name":"墨息","title":"一张纸的三种读法","kind":"ink","publicEntryOnly":false,"readingUnlocked":true,"labels":["试写","框选","入格"],"sectionGroups":[["generation"],["annotation","workflow"],["archive"]],"evidence":["https://moxi.maniforld.com/"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"试写","instruction":"查看固定字样的笔触示意","sectionIds":["generation"]},{"phase":1,"station":"left","label":"框选","instruction":"比照矩形或多边形标注边界","sectionIds":["annotation","workflow"]},{"phase":2,"station":"right","label":"入格","instruction":"查看本次本地样张的索引格","sectionIds":["archive"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":1,"id":"https://huayun.maniforld.com","sourceUrl":"https://huayun.maniforld.com","name":"画韵新生","title":"完整画面与介入范围","kind":"conservation","publicEntryOnly":false,"readingUnlocked":true,"labels":["馆藏","轮廓","遮罩"],"sectionGroups":[["collection"],["restoration"],["mask","parameters"]],"evidence":["https://huayun.maniforld.com/","https://huayun.maniforld.com/virtual-restoration","https://huayun.maniforld.com/ancient-painting-restoration"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"馆藏","instruction":"查看五类馆藏材料的公开说明","sectionIds":["collection"]},{"phase":1,"station":"right","label":"轮廓","instruction":"比照整幅作品上的轮廓层","sectionIds":["restoration"]},{"phase":2,"station":"left","label":"遮罩","instruction":"查看遮罩与介入参数的说明","sectionIds":["mask","parameters"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":2,"id":"https://hyxs.art","sourceUrl":"https://hyxs.art","name":"画韵新生·旧址","title":"同一平台的另一道门","kind":"secondary-entry","publicEntryOnly":false,"readingUnlocked":true,"labels":["入口","透见","同馆"],"sectionGroups":[["same-platform"],["shared-content"],["boundary"]],"evidence":["https://hyxs.art/"],"route":["left","entry","right"],"stages":[{"phase":0,"station":"left","label":"入口","instruction":"辨认旧址作为另一公开入口","sectionIds":["same-platform"]},{"phase":1,"station":"entry","label":"透见","instruction":"比照两个入口的共享内容","sectionIds":["shared-content"]},{"phase":2,"station":"right","label":"同馆","instruction":"确认这里不代表独立历史馆藏","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":3,"id":"https://mosheng.maniforld.com","sourceUrl":"https://mosheng.maniforld.com","name":"墨生","title":"保留完整构图的回看","kind":"process","publicEntryOnly":false,"readingUnlocked":true,"labels":["全幅","暂停·续播","重放"],"sectionGroups":[["whole-picture"],["four-stages"],["boundary"]],"evidence":["https://mosheng.maniforld.com/","https://mosheng.maniforld.com/#process","https://mosheng.maniforld.com/#app","https://mosheng.maniforld.com/#value"],"route":["right","entry","left"],"stages":[{"phase":0,"station":"right","label":"全幅","instruction":"查看完整画面的公开说明","sectionIds":["whole-picture"]},{"phase":1,"station":"entry","label":"暂停·续播","instruction":"查看四阶段过程与暂停续播示意","sectionIds":["four-stages"]},{"phase":2,"station":"left","label":"重放","instruction":"重放本地过程示意并保留完整构图","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":4,"id":"https://nuanling.maniforld.com","sourceUrl":"https://nuanling.maniforld.com","name":"暖聆","title":"状态、留言与回应","kind":"care-relay","publicEntryOnly":false,"readingUnlocked":true,"labels":["守护","留言","回应"],"sectionGroups":[["family-desk"],["messages"],["two-sides"]],"evidence":["https://nuanling.maniforld.com/dashboard","https://nuanling.maniforld.com/messages"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"守护","instruction":"查看家庭设备状态的公开说明","sectionIds":["family-desk"]},{"phase":1,"station":"left","label":"留言","instruction":"查看家人留言的本地展陈示意","sectionIds":["messages"]},{"phase":2,"station":"right","label":"回应","instruction":"比照留言与回应两侧的关系","sectionIds":["two-sides"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":5,"id":"https://nuanling.maniforld.com/app/","sourceUrl":"https://nuanling.maniforld.com/app/","name":"暖聆App","title":"短路与四项操作","kind":"elder-controls","publicEntryOnly":false,"readingUnlocked":true,"labels":["连接","四项","往返"],"sectionGroups":[["connected"],["four-actions"],["roles"]],"evidence":["https://nuanling.maniforld.com/app/","https://nuanling.maniforld.com/elder"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"连接","instruction":"查看公开演示的连接状态说明","sectionIds":["connected"]},{"phase":1,"station":"right","label":"四项","instruction":"查看看、听、说、聊四项公开操作","sectionIds":["four-actions"]},{"phase":2,"station":"left","label":"往返","instruction":"比照长者与陪伴者的角色说明","sectionIds":["roles"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":6,"id":"https://editor.maniforld.com","sourceUrl":"https://editor.maniforld.com","name":"排版助手","title":"从取样到校看","kind":"layout","publicEntryOnly":false,"readingUnlocked":true,"labels":["取样","编排","校看"],"sectionGroups":[["input"],["editing","modes"],["boundary"]],"evidence":["https://editor.maniforld.com/","https://editor.maniforld.com/step1"],"route":["left","entry","right"],"stages":[{"phase":0,"station":"left","label":"取样","instruction":"查看一份固定的本地示意材料","sectionIds":["input"]},{"phase":1,"station":"entry","label":"编排","instruction":"切换公开任务对应的刊发版式","sectionIds":["editing","modes"]},{"phase":2,"station":"right","label":"校看","instruction":"核对本地版面的标题、正文、图注与来源","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":7,"id":"https://patent.maniforld.com","sourceUrl":"https://patent.maniforld.com","name":"金陵专利局","title":"鉴藏回到档案","kind":"album","publicEntryOnly":false,"readingUnlocked":true,"labels":["入册","比照","归档"],"sectionGroups":[["patent"],["classification","trademark"],["archive","example"]],"evidence":["https://patent.maniforld.com/","https://patent.maniforld.com/patents","https://patent.maniforld.com/trademarks","https://patent.maniforld.com/projects"],"route":["right","entry","left"],"stages":[{"phase":0,"station":"right","label":"入册","instruction":"查看专利工作台的公开说明","sectionIds":["patent"]},{"phase":1,"station":"entry","label":"比照","instruction":"比照技术分类与商标栏目","sectionIds":["classification","trademark"]},{"phase":2,"station":"left","label":"归档","instruction":"查看项目档案与公开示例的关系","sectionIds":["archive","example"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":8,"id":"https://rss.maniforld.com","sourceUrl":"https://rss.maniforld.com","name":"RSS","title":"RSS 公开入口边界","kind":"public-entry","publicEntryOnly":true,"readingUnlocked":true,"labels":["入口","未读","边界"],"sectionGroups":[["entry"],["unknown"],["boundary"]],"evidence":["https://rss.maniforld.com/","https://rss.maniforld.com/dash/login","https://github.com/cooderl/wewe-rss"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"入口","instruction":"查看已核实的公开入口说明","sectionIds":["entry"]},{"phase":1,"station":"left","label":"未读","instruction":"查看订阅内容与阅读界面未读取的说明","sectionIds":["unknown"]},{"phase":2,"station":"right","label":"边界","instruction":"确认这里只展示公开边界，不接入订阅内容","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":9,"id":"https://vault.maniforld.com","sourceUrl":"https://vault.maniforld.com","name":"Vaultwarden","title":"Vaultwarden 公开入口边界","kind":"public-entry","publicEntryOnly":true,"readingUnlocked":true,"labels":["入口","身份","边界"],"sectionGroups":[["entry"],["identity"],["boundary"]],"evidence":["https://vault.maniforld.com/#/login"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"入口","instruction":"查看邮件优先的公开登录入口说明","sectionIds":["entry"]},{"phase":1,"station":"right","label":"身份","instruction":"查看服务身份说明，不查看密码库","sectionIds":["identity"]},{"phase":2,"station":"left","label":"边界","instruction":"确认这里只展示公开边界，不读取任何凭据","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":10,"id":"https://api.maniforld.com","sourceUrl":"https://api.maniforld.com","name":"API","title":"统一路由与两项模型","kind":"api-route","publicEntryOnly":false,"readingUnlocked":true,"labels":["路由","往返","观察"],"sectionGroups":[["three-steps"],["example"],["metrics"]],"evidence":["https://api.maniforld.com/","https://api.maniforld.com/pricing"],"route":["left","entry","right"],"stages":[{"phase":0,"station":"left","label":"路由","instruction":"查看公开接入步骤的说明","sectionIds":["three-steps"]},{"phase":1,"station":"entry","label":"往返","instruction":"查看两项模型与端点的本地往返示意","sectionIds":["example"]},{"phase":2,"station":"right","label":"观察","instruction":"查看缺省性能数据，不把横线当成测量结果","sectionIds":["metrics"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":11,"id":"https://biaoshu.maniforld.com","sourceUrl":"https://biaoshu.maniforld.com","name":"知虾标书","title":"知虾标书公开入口边界","kind":"public-entry","publicEntryOnly":true,"readingUnlocked":true,"labels":["定位","未读","边界"],"sectionGroups":[["identity"],["unknown"],["boundary"]],"evidence":["https://biaoshu.maniforld.com/login"],"route":["right","entry","left"],"stages":[{"phase":0,"station":"right","label":"定位","instruction":"辨认已核实的服务名称和入口","sectionIds":["identity"]},{"phase":1,"station":"entry","label":"未读","instruction":"查看受保护内容尚未读取的说明","sectionIds":["unknown"]},{"phase":2,"station":"left","label":"边界","instruction":"确认不演示未经核实的生成、评审或协作","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":12,"id":"https://reme.maniforld.com","sourceUrl":"https://reme.maniforld.com","name":"Reme","title":"匿名常在，片段限时","kind":"privacy-window","publicEntryOnly":false,"readingUnlocked":true,"labels":["匿名","短显","归隐"],"sectionGroups":[["privacy"],["events","local-demo"],["boundary"]],"evidence":["https://reme.maniforld.com/","https://reme.maniforld.com/home","https://reme.maniforld.com/family"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"匿名","instruction":"查看匿名骨架与隐私边界说明","sectionIds":["privacy"]},{"phase":1,"station":"left","label":"短显","instruction":"查看本地事件短显示意，不接入影像","sectionIds":["events","local-demo"]},{"phase":2,"station":"right","label":"归隐","instruction":"归闭事件窗并查看媒体时间边界","sectionIds":["boundary"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":13,"id":"/?read=13","sourceUrl":"/?read=13","name":"AI两年","title":"工具增长，本心不断","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["人的线","逐节","自持"],"sectionGroups":[["opening"],["s1","s2","s3","s4","s5","s6","s7","s8","s9","s10"],["s10","source-note"]],"evidence":["/?read=13","/?read=13","/?read=13","/?read=13","/?read=13","/?read=13","/?read=13","/?read=13"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"人的线","instruction":"查看人的判断贯穿工具经历的开篇","sectionIds":["opening"]},{"phase":1,"station":"right","label":"逐节","instruction":"逐节查看十段经历中的分工与边界","sectionIds":["s1","s2","s3","s4","s5","s6","s7","s8","s9","s10"]},{"phase":2,"station":"left","label":"自持","instruction":"查看自持与原文来源说明","sectionIds":["s10","source-note"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":14,"id":"/?read=14","sourceUrl":"/?read=14","name":"凝结核列传","title":"不同距离，共同承托","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["总览","十二传","留痕"],"sectionGroups":[["opening"],["biography-01","biography-02","biography-03","biography-04","biography-05","biography-06","biography-07","biography-08","biography-09","biography-10","biography-11","biography-12"],["biography-11","source-note"]],"evidence":["/?read=14"],"route":["left","entry","right"],"stages":[{"phase":0,"station":"left","label":"总览","instruction":"查看人物关系与身份形成的开篇","sectionIds":["opening"]},{"phase":1,"station":"entry","label":"十二传","instruction":"查看十二篇人物关系中的一篇并可继续轮换","sectionIds":["biography-01","biography-02","biography-03","biography-04","biography-05","biography-06","biography-07","biography-08","biography-09","biography-10","biography-11","biography-12"]},{"phase":2,"station":"right","label":"留痕","instruction":"查看关系留痕与来源说明","sectionIds":["biography-11","source-note"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":15,"id":"/?read=15","sourceUrl":"/?read=15","name":"从因到果","title":"来路、交汇与延续","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["来路","三结","延续"],"sectionGroups":[["causal-diagram"],["chapter-01","chapter-02","chapter-03"],["chapter-03","source-note"]],"evidence":["/?read=15"],"route":["right","entry","left"],"stages":[{"phase":0,"station":"right","label":"来路","instruction":"查看七股人物脉络的因果图","sectionIds":["causal-diagram"]},{"phase":1,"station":"entry","label":"三结","instruction":"查看三次交汇中的一节并可继续轮换","sectionIds":["chapter-01","chapter-02","chapter-03"]},{"phase":2,"station":"left","label":"延续","instruction":"查看延续与终止并存的结尾说明","sectionIds":["chapter-03","source-note"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":16,"id":"https://crying-city.maniforld.com","sourceUrl":"https://crying-city.maniforld.com","name":"哭泣的城市","title":"从雨巷走向晴庭","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["雨巷","共建","晴庭"],"sectionGroups":[["route-map","c1","c2","c3"],["c4","c5","c6","c7","c8"],["c9","c10","c11"]],"evidence":["https://crying-city.maniforld.com/#c1","https://crying-city.maniforld.com/#c3","https://crying-city.maniforld.com/#c4","https://crying-city.maniforld.com/#c5","https://crying-city.maniforld.com/#c6","https://crying-city.maniforld.com/#c8","https://crying-city.maniforld.com/#c9","https://crying-city.maniforld.com/#c10","https://crying-city.maniforld.com/#c11"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"雨巷","instruction":"查看雨中到达与陌生感的段落","sectionIds":["route-map","c1","c2","c3"]},{"phase":1,"station":"left","label":"共建","instruction":"查看共同工作与归属的段落","sectionIds":["c4","c5","c6","c7","c8"]},{"phase":2,"station":"right","label":"晴庭","instruction":"查看晴天告别与回馈的段落","sectionIds":["c9","c10","c11"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":17,"id":"https://double-stars.maniforld.com","sourceUrl":"https://double-stars.maniforld.com","name":"双星记","title":"各自独立，共同中心","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["各自","四语","并肩"],"sectionGroups":[["o1","o2"],["o3","o4","o5","o6"],["o7","o8"]],"evidence":["https://double-stars.maniforld.com/#o1","https://double-stars.maniforld.com/#o2","https://double-stars.maniforld.com/#o3","https://double-stars.maniforld.com/#o4","https://double-stars.maniforld.com/#o5","https://double-stars.maniforld.com/#o6","https://double-stars.maniforld.com/#o8"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"各自","instruction":"查看两位朋友各自独立的开篇","sectionIds":["o1","o2"]},{"phase":1,"station":"right","label":"四语","instruction":"查看四类说话语域中的一段","sectionIds":["o3","o4","o5","o6"]},{"phase":2,"station":"left","label":"并肩","instruction":"查看平等并肩而非主从的关系","sectionIds":["o7","o8"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":18,"id":"https://five-versions.maniforld.com","sourceUrl":"https://five-versions.maniforld.com","name":"思想者的五个版本","title":"旧稿仍在，下一稿开放","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["母题","五稿","未完"],"sectionGroups":[["version-tree","c1"],["c2","c3","c4","c5","c6"],["c7","c8"]],"evidence":["https://five-versions.maniforld.com/#c1","https://five-versions.maniforld.com/#c2","https://five-versions.maniforld.com/#c3","https://five-versions.maniforld.com/#c4","https://five-versions.maniforld.com/#c5","https://five-versions.maniforld.com/#c6","https://five-versions.maniforld.com/#c7","https://five-versions.maniforld.com/#c8","https://five-versions.maniforld.com/"],"route":["left","entry","right"],"stages":[{"phase":0,"station":"left","label":"母题","instruction":"查看共同母题与版本树","sectionIds":["version-tree","c1"]},{"phase":1,"station":"entry","label":"五稿","instruction":"查看五次修订中的一稿并可继续轮换","sectionIds":["c2","c3","c4","c5","c6"]},{"phase":2,"station":"right","label":"未完","instruction":"查看支线、失败与未完的下一稿","sectionIds":["c7","c8"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":19,"id":"/?read=19","sourceUrl":"/?read=19","name":"置身青媒内","title":"把接力的连接留下","kind":"handover","publicEntryOnly":false,"readingUnlocked":true,"labels":["接件","共作","交接"],"sectionGroups":[["s01-一-我离开的时候-最先想起的不是荣誉-而是一条消","s02-二-青媒不是一个-写稿组织-它是一个小型生产系统","s03-三-我第一次真正意识到-负责人-不是一个称呼"],["s04-四-我在青媒学会的-不是怎么写漂亮话-而是怎么让","s05-五-我见过青媒最好的样子-是大家在混乱里仍然愿意","s06-六-青媒让我明白-所谓-能力-很多时候是对麻烦的","s07-七-关于-AI-和工具-我不想把它们当成炫技-而"],["s09-九-如果要说我留下了什么","s10-十-写给下一届-不要只继承任务-也要继承判断","s12-十二-离开不是把自己摘出去-而是把路标留下来","s13-十三-我愿意留下的几条具体原则","s15-十五-最后的交接清单"]],"evidence":["/?read=19"],"route":["right","entry","left"],"stages":[{"phase":0,"station":"right","label":"接件","instruction":"查看接件与小型生产系统的段落","sectionIds":["s01-一-我离开的时候-最先想起的不是荣誉-而是一条消","s02-二-青媒不是一个-写稿组织-它是一个小型生产系统","s03-三-我第一次真正意识到-负责人-不是一个称呼"]},{"phase":1,"station":"entry","label":"共作","instruction":"查看分工、审核与相互补位的段落","sectionIds":["s04-四-我在青媒学会的-不是怎么写漂亮话-而是怎么让","s05-五-我见过青媒最好的样子-是大家在混乱里仍然愿意","s06-六-青媒让我明白-所谓-能力-很多时候是对麻烦的","s07-七-关于-AI-和工具-我不想把它们当成炫技-而"]},{"phase":2,"station":"left","label":"交接","instruction":"查看交接原则与给后来者的清单","sectionIds":["s09-九-如果要说我留下了什么","s10-十-写给下一届-不要只继承任务-也要继承判断","s12-十二-离开不是把自己摘出去-而是把路标留下来","s13-十三-我愿意留下的几条具体原则","s15-十五-最后的交接清单"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":20,"id":"/?read=20","sourceUrl":"/?read=20","name":"月雪","title":"从称呼走向并肩","kind":"integrated-garden","publicEntryOnly":false,"readingUnlocked":true,"labels":["收窗","借景","通明"],"sectionGroups":[["preface","c1","c2","c3","c4"],["c5","c6"],["c7","c8","c9","c10"]],"evidence":["/?read=20","/?read=20","/?read=20"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"收窗","instruction":"查看关系开篇与称呼的变化","sectionIds":["preface","c1","c2","c3","c4"]},{"phase":1,"station":"left","label":"借景","instruction":"查看语气改写与相互理解的段落","sectionIds":["c5","c6"]},{"phase":2,"station":"right","label":"通明","instruction":"查看可靠协作与日常共同工作的段落","sectionIds":["c7","c8","c9","c10"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":21,"id":"https://qingyang-before-proof.maniforld.com","sourceUrl":"https://qingyang-before-proof.maniforld.com","name":"清样之前","title":"共同修订，也留页边","kind":"narrative","publicEntryOnly":false,"readingUnlocked":true,"labels":["毛稿","共修","页边"],"sectionGroups":[["draft","first-proof"],["red-pencil","revision","columns"],["margin","final-proof","outside-page"]],"evidence":["https://qingyang-before-proof.maniforld.com/#draft","https://qingyang-before-proof.maniforld.com/#red-pencil","https://qingyang-before-proof.maniforld.com/#final-proof"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"毛稿","instruction":"查看毛稿与第一轮校样","sectionIds":["draft","first-proof"]},{"phase":1,"station":"right","label":"共修","instruction":"查看红笔、修订与并列栏位","sectionIds":["red-pencil","revision","columns"]},{"phase":2,"station":"left","label":"页边","instruction":"查看页边、清样与工作之外的生活","sectionIds":["margin","final-proof","outside-page"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":22,"id":"https://rubbing.maniforld.com","sourceUrl":"https://rubbing.maniforld.com","name":"拓片","title":"原件不动，未决不填","kind":"evidence-overlay","publicEntryOnly":false,"readingUnlocked":true,"labels":["原件","比照","未决"],"sectionGroups":[["case-intro","case-workflow"],["case-repair","report-process-repair"],["report-limits","report-next"]],"evidence":["https://rubbing.maniforld.com/cases/shichen-multiwitness/#workflow","https://rubbing.maniforld.com/cases/shichen-multiwitness/","https://rubbing.maniforld.com/cases/shichen-multiwitness/report/#knowledge-network","https://rubbing.maniforld.com/#report"],"route":["left","entry","right"],"stages":[{"phase":0,"station":"left","label":"原件","instruction":"查看原件冻结与研究流程","sectionIds":["case-intro","case-workflow"]},{"phase":1,"station":"entry","label":"比照","instruction":"比照可逆的非生成式可读性增强层","sectionIds":["case-repair","report-process-repair"]},{"phase":2,"station":"right","label":"未决","instruction":"查看研究限制与仍待核实的差异","sectionIds":["report-limits","report-next"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":23,"id":"https://uncolored-butterfly.maniforld.com","sourceUrl":"https://uncolored-butterfly.maniforld.com","name":"未上色的蝴蝶","title":"不同视点，同一留白","kind":"butterfly","publicEntryOnly":false,"readingUnlocked":true,"labels":["展翼","半展","收翼"],"sectionGroups":[["chapter-4"],["chapter-6"],["afterword"]],"evidence":["https://uncolored-butterfly.maniforld.com/"],"route":["right","entry","left"],"stages":[{"phase":0,"station":"right","label":"展翼","instruction":"展开既有机械翼并查看对应原文","sectionIds":["chapter-4"]},{"phase":1,"station":"entry","label":"半展","instruction":"半展机械翼并查看另一段原文","sectionIds":["chapter-6"]},{"phase":2,"station":"left","label":"收翼","instruction":"收翼并查看后记，不把上色当作完成奖励","sectionIds":["afterword"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":24,"id":"https://k.playe.top","sourceUrl":"https://k.playe.top","name":"MindCareAI","title":"安静停留的本地示意","kind":"quiet-timer","publicEntryOnly":false,"readingUnlocked":true,"labels":["开始","暂停·续行","结束"],"sectionGroups":[["daily"],["time"],["local"]],"evidence":["https://k.playe.top/","https://k.playe.top/#/","https://k.playe.top/#/login"],"route":["entry","left","right"],"stages":[{"phase":0,"station":"entry","label":"开始","instruction":"开始本地安静计时并查看公开日常内容","sectionIds":["daily"]},{"phase":1,"station":"left","label":"暂停·续行","instruction":"暂停或续行本地计时并查看时间说明","sectionIds":["time"]},{"phase":2,"station":"right","label":"结束","instruction":"结束本地示意并确认不宣称治疗效果","sectionIds":["local"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]},{"index":25,"id":"https://github.com/Lx050","sourceUrl":"https://github.com/Lx050","name":"GitHub","title":"旧连接可查，新构件可续","kind":"maker","publicEntryOnly":false,"readingUnlocked":true,"labels":["试墨","活字","接续"],"sectionGroups":[["brush"],["tools"],["research","forks","rights"]],"evidence":["https://github.com/Lx050?tab=repositories","https://github.com/Lx050/mo-hun","https://github.com/Lx050/mosheng-ios-public#readme-ov-file","https://github.com/Lx050?page=2&tab=repositories"],"route":["entry","right","left"],"stages":[{"phase":0,"station":"entry","label":"试墨","instruction":"查看数字毛笔与本地试墨示意","sectionIds":["brush"]},{"phase":1,"station":"right","label":"活字","instruction":"查看公开工具项目与装配关系","sectionIds":["tools"]},{"phase":2,"station":"left","label":"接续","instruction":"查看研究、fork 与权利边界说明","sectionIds":["research","forks","rights"]},{"phase":null,"station":"entry","label":"返回入口","instruction":"返回入口站，结束本轮空间探索；原文阅读始终独立开放","sectionIds":[]}]}]);

  // These are task guidance, not additions to the authored source text. Each
  // objective uses an existing building-actions control. No reading/scroll gates.
  const OBJECTIVES = freeze({
    0: {family:'boundary-pair',label:'边界比照',phases:{1:{kind:'cycle',presses:2,text:'操作「框选」两次，比较既有矩形与多边形范围'}}},
    1: {family:'mask-pair',label:'遮罩比照',phases:{2:{kind:'cycle',presses:2,text:'操作「遮罩」两次，比较两项既有遮罩选项'}}},
    3: {family:'playback-control',label:'暂停与续播',phases:{1:{kind:'playback',presses:3,seconds:1,holdAfter:1,text:'开始播放，原地观察 1 秒，再操作暂停、续播'}}},
    6: {family:'layout-pair',label:'同稿换版',phases:{1:{kind:'cycle',presses:2,text:'操作「编排」两次，比较同一份示意材料的两种版式'}}},
    10:{family:'route-pair',label:'两项路由',phases:{0:{kind:'cycle',presses:2,text:'操作「路由」两次，比较既有 openai / anthropic 路线；不发送请求'}}},
    22:{family:'two-view-comparison',label:'双视点比照',phases:{1:{kind:'views',presses:1,views:['left','right'],text:'开启比照层后，分别到左右观察站朝向建筑中央；不改动原件'}}},
    23:{family:'facing-study',label:'面向机械翼',phases:Object.fromEntries([0,1,2].map(phase=>[phase,{kind:'face',presses:1,face:true,text:'在当前站朝向建筑中央，再操作既有机械翼；无需等待动画'}]))},
    24:{family:'brief-stillness',label:'一秒停留',phases:{0:{kind:'still',presses:1,seconds:1,holdAfter:1,text:'开始后在入口原地停留 1 秒；不必等完三分钟计时'}}}
  });
  const SPECS = freeze(SOURCE_SPECS.map(spec => ({...spec,
    objectiveFamily:OBJECTIVES[spec.index]?.family||(spec.publicEntryOnly?'public-boundary':spec.kind==='narrative'?'shared-facing':'source-walk'),
    objectiveLabel:OBJECTIVES[spec.index]?.label||(spec.publicEntryOnly?'公开边界':spec.kind==='narrative'?'面向展陈':'三站探索'),
    exemplar:!!OBJECTIVES[spec.index]
  })));
  function goalFor(state) {
    return OBJECTIVES[state.spec.index]?.phases[state.stage] ||
      (state.spec.kind==='narrative' && state.stage===1 ? {kind:'face',presses:1,face:true,text:'朝向建筑中央再切换既有展陈；阅读不是完成条件'} :
        {kind:'activate',presses:1,text:'到站后操作当前构件；无需读完原文'});
  }

  const byId = new Map(SPECS.map(spec => [spec.id, spec]));
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  function resolve(input) {
    if (input && typeof input === 'object') input = input.index ?? input.metadata?.index ?? input.id;
    if (typeof input === 'string' && byId.has(input)) return byId.get(input);
    if (typeof input === 'string' && /^\d+$/.test(input)) input = Number(input);
    return Number.isInteger(input) && input >= 0 && input < SPECS.length ? SPECS[input] : null;
  }
  function makeStations(options = {}) {
    const width = positive(options.width, 18), depth = positive(options.depth, 22);
    const index = resolve(options.index)?.index || 0;
    const radius = 2.2, front = -depth / 2;
    // All connecting segments stay in the exterior forecourt, never through a wall.
    // Slightly asymmetric setbacks and alternating routes keep the traversal varied.
    return {
      entry: {id:'entry',label:'入口站',x:0,y:0,z:front - 5.5,radius},
      left: {id:'left',label:'左侧观察站',x:-width/2 - 4.8,y:0,z:front - 6.5 - (index%3)*1.15,radius},
      right: {id:'right',label:'右侧观察站',x:width/2 + 4.8,y:0,z:front - 6.5 - ((index+1)%3)*1.15,radius}
    };
  }
  function coordinates(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.z)) return null;
    const y = value.y == null ? 0 : value.y;
    return Number.isFinite(y) ? {x:value.x,y,z:value.z} : null;
  }
  function configureStations(spec, options) {
    const defaults = makeStations({...options,index:spec.index}), result = {};
    for (const id of ['entry','left','right']) {
      const replacement = options.stations?.[id], point = coordinates(replacement);
      const base = defaults[id];
      // Copies avoid the host inadvertently moving a checkpoint via a shared object.
      result[id] = point ? {...base,...point,radius:Math.min(2.5,positive(replacement.radius,base.radius))} : {...base};
    }
    // Overlapping checkpoints would permit remotely clicking through multiple phases.
    // Reject the entire override instead of weakening the spatial requirement.
    const pairs = [['entry','left'],['entry','right'],['left','right']];
    if (pairs.some(([a,b]) => Math.hypot(result[a].x-result[b].x,result[a].y-result[b].y,result[a].z-result[b].z) <= result[a].radius+result[b].radius+0.5)) return defaults;
    return result;
  }
  function create(options = {}) {
    let storage = null, active = null, disposed = false;
    const states = new Map(), completed = new Set();
    try { storage = Object.prototype.hasOwnProperty.call(options,'storage') ? options.storage : global.localStorage; } catch (_) {}
    try {
      const raw = storage?.getItem?.(STORAGE_KEY), saved = raw ? JSON.parse(raw) : null;
      if (saved?.version === 1 && saved.completed && typeof saved.completed === 'object' && !Array.isArray(saved.completed)) {
        for (const spec of SPECS) if (Object.prototype.hasOwnProperty.call(saved.completed,spec.id) && saved.completed[spec.id] === true) completed.add(spec.id);
      }
    } catch (_) { /* Corrupt/unavailable storage never blocks exploration or reading. */ }
    function save() {
      const record = {};
      for (const spec of SPECS) if (completed.has(spec.id)) record[spec.id] = true;
      try { storage?.setItem?.(STORAGE_KEY,JSON.stringify({version:1,completed:record})); } catch (_) {}
    }
    function clearMotion(state) {
      state.position=null; state.near=false; state.facing=null; state.actionState=null;
      state.sampleAnchor=null; state.held=0;
    }
    function clearGoal(state) {
      state.presses=0; state.pending=null; state.waiting=false; state.held=0; state.sampleAnchor=null; state.viewIndex=-1;
      state.confirmedCounts=null; state.recovery=null;
    }
    function stateFor(spec, config) {
      if (!states.has(spec.index)) {
        const state={spec,stage:0,stations:configureStations(spec,config||{}),position:null,near:false,facing:null,actionState:null};
        clearGoal(state); states.set(spec.index,state);
      }
      const state=states.get(spec.index);
      if (config) { state.stations=configureStations(spec,config); clearMotion(state); }
      return state;
    }
    function activeState() { return active == null ? null : states.get(active); }
    function currentStation(state) {
      const stage=state.spec.stages[state.stage];
      const id=state.viewIndex>=0 ? goalFor(state).views[state.viewIndex] : stage?.station;
      return state.stations[id] || null;
    }
    function distanceFor(state) {
      const point=currentStation(state);
      if (!point || !state.position) return null;
      return Math.hypot(state.position.x-point.x,state.position.y-point.y,state.position.z-point.z);
    }
    function facesBuilding(state) {
      if (!state.position || !state.facing) return false;
      const a=Math.hypot(state.facing.x,state.facing.z), b=Math.hypot(state.position.x,state.position.z);
      // 60 degrees either side is intentionally forgiving for touch and keyboard.
      return a>1e-6 && b>1e-6 && (-state.position.x*state.facing.x-state.position.z*state.facing.z)/(a*b)>=.5;
    }
    function validAction(value,state) {
      if(value===null)return {index:state.spec.index,phase:-1,counts:[0,0,0],playing:false,paused:false};
      if (!value || value.index!==state.spec.index || value.kind!==state.spec.kind || !Number.isInteger(value.phase) || value.phase < -1 || value.phase > 2 ||
        !Array.isArray(value.counts) || value.counts.length!==3 || !value.counts.every(n=>Number.isSafeInteger(n)&&n>=0)) return null;
      return {index:value.index,phase:value.phase,counts:value.counts.slice(),playing:!!value.playing,paused:!!value.paused,completed:!!value.completed};
    }
    function objectiveFor(state, near) {
      const goal=goalFor(state), viewing=state.viewIndex>=0, facingRequired=!!goal.face||viewing;
      const facingSatisfied=!facingRequired||facesBuilding(state);
      let text=state.stage===3?'回到入口完成本轮；原文始终开放':goal.text;
      if (state.stage===4) text='本轮完成；可自由阅读、重访或退出';
      else if (state.pending) text='等待既有展陈响应；不把未生效的操作算作完成';
      else if (viewing) text='比照 '+(state.viewIndex+1)+' / '+goal.views.length+'：到'+currentStation(state).label+'，朝向建筑中央';
      else if (state.waiting) text='原地观察 '+Math.min(goal.seconds,state.held).toFixed(1)+' / '+goal.seconds+' 秒；离开或移动会重新计时';
      else if (goal.presses>1) text+=(goal.kind==='playback' ? ' · 下一步：'+['开始','暂停','续播'][state.presses] : ' · 已操作 '+state.presses+' / '+goal.presses);
      if (facingRequired && near && !facingSatisfied) text+=' · 请转向建筑中央';
      if (state.stage<3 && near && !state.actionState && !state.pending) text+=' · 等待展陈状态';
      return {family:state.spec.objectiveFamily,kind:goal.kind,text,presses:state.presses,requiredPresses:goal.presses,
        seconds:state.held,requiredSeconds:goal.seconds||0,pendingAction:!!state.pending,waiting:state.waiting,
        remainingSeconds:Math.max(0,(goal.seconds||0)-state.held),
        viewIndex:state.viewIndex,viewCount:goal.views?.length||0,
        completedViews:Math.max(0,state.viewIndex),requiredViews:goal.views?.length||0,
        facingRequired,facingSatisfied,recovery:state.recovery?{...state.recovery}:null};
    }
    const RETRY_HINT='仅重新开始当前未完成的观察；保留已完成阶段、当前位置和展陈状态，不会替你操作构件。';
    function feedbackFor(state, near, objective, distance, isActive, reason) {
      if(reason==='disposed')return {code:'disposed',text:'探索已关闭；原文阅读不受影响。'};
      if(!state)return {code:reason||'not-entered',text:'先进入这座建筑的探索；原文仍可直接阅读。'};
      const stage=state.spec.stages[state.stage],station=currentStation(state),goal=goalFor(state);
      const travel=station ? '前往'+station.label+(distance==null?'': '，距站点范围还差 '+Math.max(0,distance-station.radius).toFixed(1)+' 米') : '';
      const make=(code,text)=>({code,text});
      if(!isActive)return make('inactive','探索未开启；可从已完成阶段继续，原文始终开放。');
      if(state.stage===4)return make('already-complete','本轮已完成；可自由阅读、重访或退出。');
      if(state.stage===3)return make('return-to-entry',travel+'，返回入口后完成本轮；无需再操作构件。');
      if(reason==='wrong-phase')return make('wrong-phase','当前需要「'+stage.label+'」，请按指引操作这一项，不是其他阶段。');
      if(reason==='not-facing-building')return make('not-facing-building','已到站，请转向建筑中央，再操作「'+stage.label+'」。');
      if(reason==='action-state-unavailable')return make('action-state-unavailable','暂未取得展陈状态；等待状态恢复后再操作，阅读不受影响。');
      // The authored pause/resume toggle cannot replay an already ended process.
      // Explain the real control instead of silently resetting it or waiting forever.
      if(goal.kind==='playback'&&state.actionState?.completed&&!state.actionState.playing)
        return make('playback-ended','播放已结束；已完成阶段保留。请先退出探索，操作「重放」，再进入继续观察。');
      if(state.recovery){
        const next=!near?travel+'，再操作「'+stage.label+'」。':!state.actionState?'等待展陈状态恢复后再操作。':objective.facingRequired&&!objective.facingSatisfied?'请转向建筑中央，再操作「'+stage.label+'」。':'请重新操作「'+stage.label+'」。';
        if(state.recovery.code==='retry')return make('retry','仅重新开始当前未完成的观察；已完成阶段、当前位置和展陈状态保留。'+next);
        const lead=state.recovery.code==='phase-changed'?'展陈已切换到其他阶段':'展陈状态已改变';
        return make(state.recovery.code,lead+'；本阶段观察已重新开始，已完成阶段保留。'+next);
      }
      if(!near)return make('not-at-station',(state.viewIndex>=0?'双视点 '+(state.viewIndex+1)+' / '+goal.views.length+'：':'')+travel+'。');
      if(state.pending)return make('action-not-observed','尚未收到这次展陈操作的生效状态；可重试本阶段观察，不会代替你操作构件。');
      if(!state.actionState)return make('action-state-unavailable','暂未取得展陈状态；等待状态恢复后再操作，阅读不受影响。');
      if(objective.facingRequired&&!objective.facingSatisfied)return make('not-facing-building',(state.viewIndex>=0?'双视点 '+(state.viewIndex+1)+' / '+goal.views.length+'：':'')+'已到站，请转向建筑中央。');
      if(state.waiting)return make('hold-observation','已开始观察：原地停留 '+Math.min(goal.seconds,state.held).toFixed(1)+' / '+goal.seconds+' 秒，还需 '+objective.remainingSeconds.toFixed(1)+' 秒；移动或离站会重新计时。');
      if(state.viewIndex>=0)return make('viewpoint-incomplete','双视点 '+(state.viewIndex+1)+' / '+goal.views.length+'：在'+station.label+'朝向建筑中央；无需再次操作比照层。');
      return make('ready','已到'+station.label+'；'+objective.text+'。');
    }
    function snapshot(state) {
      if (!state) return null;
      const spec=state.spec, stage=spec.stages[state.stage], station=currentStation(state);
      const distance=distanceFor(state),isActive=active===spec.index&&!disposed;
      const near=isActive&&distance!=null&&!!station&&distance<=station.radius;
      const runCompleted=state.stage===spec.stages.length, objective=objectiveFor(state,near);
      const canInteract=near&&state.stage<3&&!state.pending&&!state.waiting&&state.viewIndex<0&&objective.facingSatisfied&&!!state.actionState;
      const feedback=feedbackFor(state,near,objective,distance,isActive);
      const instruction=runCompleted?'本轮探索完成；可以自由阅读或重新走一遍':stage.instruction+' · 任务指引：'+objective.text;
      return {
        index:spec.index,id:spec.id,sourceUrl:spec.sourceUrl,name:spec.name,title:spec.title,
        active:isActive,status:!isActive?'inactive':runCompleted?'complete':state.stage===3?'returning':canInteract?'ready':near?'observing':'exploring',
        stage:state.stage,step:state.stage,stageCount:spec.stages.length,total:spec.stages.length,
        completedSteps:state.stage,completedActions:Math.min(3,state.stage),ratio:state.stage/spec.stages.length,
        completed:completed.has(spec.id),runCompleted,replay:completed.has(spec.id)&&!runCompleted,
        readingUnlocked:true,publicEntryOnly:spec.publicEntryOnly,framework:FRAMEWORK,exemplar:spec.exemplar,
        objective,objectiveText:objective.text,objectiveLabel:spec.objectiveLabel,
        feedback,canRetry:isActive&&state.stage<3,retryHint:RETRY_HINT,
        expected:stage?{...stage,station:station.id,sectionIds:stage.sectionIds.slice(),sourceInstruction:stage.instruction,instruction,
          position:{x:station.x,y:station.y,z:station.z},radius:station.radius,stationLabel:station.label}:null,
        station:station?{...station}:null,stations:Object.fromEntries(Object.entries(state.stations).map(([key,value])=>[key,{...value}])),
        distance,distanceRemaining:distance==null||!station?null:Math.max(0,distance-station.radius),near,canInteract,instruction,phase:stage?.phase??null
      };
    }
    function publish(state, event) {
      const value=snapshot(state);
      if (typeof options.onChange==='function') options.onChange(value,event);
      return value;
    }
    function progress(input) {
      const spec=input==null?activeState()?.spec:resolve(input);
      return spec?snapshot(stateFor(spec)):null;
    }
    function enter(input, config) {
      if (disposed) return null;
      const spec=resolve(input);if(!spec)return null;
      const previous=activeState();
      if(previous&&previous.spec.index!==spec.index){active=null;clearMotion(previous);clearGoal(previous);publish(previous,'exit');}
      const state=stateFor(spec,config);
      if(state.stage===spec.stages.length){state.stage=0;clearGoal(state);}
      active=spec.index;clearMotion(state);clearGoal(state);
      return publish(state,'enter');
    }
    function advance(state) {
      state.stage++;clearGoal(state);state.position=null;state.near=false;state.facing=null;
    }
    function observe(position, context={}) {
      if(disposed)return null;
      if(!context||typeof context!=='object')context={};
      const state=activeState();if(!state)return null;
      const before=snapshot(state), previous=state.position;
      state.position=coordinates(position);
      const facing=coordinates(context.facing);
      state.facing=facing?{x:facing.x,z:facing.z}:null;
      state.actionState=validAction(context.actionState,state);
      const distance=distanceFor(state),station=currentStation(state);
      const near=!!station&&distance!=null&&distance<=station.radius;
      state.near=near;
      if(state.stage===3&&near){
        state.stage=4;clearGoal(state);state.near=false;completed.add(state.spec.id);save();
        return publish(state,'complete');
      }
      const goal=goalFor(state), action=state.actionState;
      let event=null, confirmed=false;
      // Free exhibit controls can change or stop a local demo while a route is
      // interrupted. Keep completed phases, never keep an impossible subgoal.
      function restartObservation(code) {
        clearGoal(state);state.recovery={code};event='objective-restarted';
      }
      if(!state.pending&&action&&(state.presses>0||state.waiting||state.viewIndex>=0)){
        const changedPhase=action.phase!==state.spec.stages[state.stage]?.phase;
        const changedCount=state.confirmedCounts&&action.counts.some((n,i)=>n!==state.confirmedCounts[i]);
        const changedPlayback=goal.kind==='playback'&&(state.presses===1?!action.playing:state.presses===2?!action.paused:false);
        if(changedPhase||changedCount||changedPlayback||(state.waiting&&!action.playing))
          restartObservation(changedPhase?'phase-changed':goal.kind==='playback'&&action.completed?'playback-ended':'action-state-changed');
      }
      // Do not strand a pending acknowledgement after a free control changes the
      // source. An unchanged pre-action state still waits, never fakes success.
      if(state.pending&&action){
        const pending=state.pending, unchanged=action.phase===pending.before.phase&&
          action.counts.every((n,i)=>n===pending.before.counts[i])&&action.playing===pending.before.playing&&action.paused===pending.before.paused;
        const matches=action.phase===pending.phase&&action.counts[pending.phase]===pending.count&&
          action.counts.every((n,i)=>i===pending.phase||n===pending.before.counts[i]);
        if(!unchanged&&!matches)restartObservation(action.phase!==pending.phase?'phase-changed':'action-state-changed');
      }
      if(state.pending&&action&&action.phase===state.pending.phase&&action.counts[action.phase]===state.pending.count){
        // For playback, verify the actual authored toggle, not a click counter.
        const playing=goal.kind!=='playback'||(state.presses===1?action.paused:action.playing);
        // Re-entering from a freely running process may make the first toggle
        // pause it. That safe preparation is real, but does not fake the sample.
        if(goal.kind==='playback'&&state.presses===0&&action.paused){
          state.pending=null;state.recovery=null;confirmed=true;event='playback-prepared';
        } else if(playing){
          state.pending=null;state.recovery=null;state.confirmedCounts=action.counts.slice();state.presses++;confirmed=true;event='action-observed';
          if(goal.seconds&&state.presses===goal.holdAfter){state.waiting=true;state.held=0;state.sampleAnchor=state.position?{...state.position}:null;}
          else if(state.presses===goal.presses){
            if(goal.views){state.viewIndex=0;state.near=false;event='viewpoint';}
            else {advance(state);event='phase';}
          }
        } else {
          restartObservation(action.completed?'playback-ended':'action-state-changed');
        }
      }
      // A real, bounded foreground sample is required; missing/huge dt never
      // completes a hold. No elapsed wall-clock or animation-end requirements.
      if(state.waiting&&!confirmed){
        const dt=Number.isFinite(context.dt)&&context.dt>0?Math.min(.1,context.dt):0;
        const anchor=state.sampleAnchor, p=state.position;
        const same=near&&p&&previous&&anchor&&Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<=.04&&
          Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z)<=.18;
        if(!same){state.held=0;state.sampleAnchor=p?{...p}:null;}
        else if(action&&action.phase===state.spec.stages[state.stage].phase&&action.playing) state.held=Math.min(goal.seconds,state.held+dt);
        if(state.held+1e-9>=goal.seconds){
          state.waiting=false;state.held=goal.seconds;event='sample';
          if(state.presses===goal.presses){advance(state);event='phase';}
        }
      }
      if(state.viewIndex>=0&&!confirmed&&near&&facesBuilding(state)&&action&&action.phase===state.spec.stages[state.stage].phase){
        state.viewIndex++;event='viewpoint';state.near=false;
        if(state.viewIndex===goal.views.length){advance(state);event='phase';}
      }
      const after=snapshot(state);
      if(!event&&(before.near!==after.near||before.canInteract!==after.canInteract))event=after.canInteract?'arrive':after.near?'observe':'depart';
      if(!event&&Math.floor(before.objective.seconds*4)!==Math.floor(after.objective.seconds*4))event='sample';
      return event?publish(state,event):after;
    }
    function interact(phase) {
      const state=activeState(),failure=reason=>{
        const progress=snapshot(state);
        const feedback=feedbackFor(state,progress?.near,progress?.objective,progress?.distance,progress?.active,reason);
        return {ok:false,reason,feedback,progress};
      };
      if(disposed)return failure('disposed');
      if(!state)return failure('not-entered');
      if(state.stage>=3)return failure(state.stage===3?'return-to-entry':'already-complete');
      if(!Number.isInteger(phase)||state.spec.stages[state.stage].phase!==phase)return failure('wrong-phase');
      const distance=distanceFor(state),station=currentStation(state);
      if(distance==null||distance>station.radius)return failure('not-at-station');
      if(state.pending)return failure('action-not-observed');
      if(state.waiting||state.viewIndex>=0)return failure('observation-incomplete');
      if(!state.actionState)return failure('action-state-unavailable');
      if(goalFor(state).face&&!facesBuilding(state))return failure('not-facing-building');
      const accepted=state.spec.stages[state.stage];
      state.recovery=null;
      state.pending={phase,count:state.actionState.counts[phase]+1,before:{...state.actionState,counts:state.actionState.counts.slice()}};
      return {ok:true,reason:'action-requested',phase:accepted.phase,sectionIds:accepted.sectionIds.slice(),progress:publish(state,'action')};
    }
    function exit() {
      const state=activeState();if(!state)return null;
      active=null;clearMotion(state);clearGoal(state);
      return publish(state,'exit');
    }
    function retry(input) {
      if(disposed)return null;
      const spec=input==null?activeState()?.spec:resolve(input);if(!spec)return null;
      const state=stateFor(spec);
      // No exhibit callback, storage write, movement, completed-step reset or
      // level switch: only the current unfinished observation may be retried.
      if(active!==spec.index||state.stage>=3)return snapshot(state);
      clearGoal(state);state.recovery={code:'retry'};
      return publish(state,'retry');
    }
    function reset(input) {
      if(disposed)return null;
      const spec=input==null?activeState()?.spec:resolve(input);if(!spec)return null;
      const state=stateFor(spec);state.stage=0;clearGoal(state);clearMotion(state);
      if(completed.delete(spec.id))save();
      return publish(state,'reset');
    }
    function dispose() { if (!disposed) { exit(); disposed = true; states.clear(); } }
    return Object.freeze({enter,observe,interact,exit,retry,reset,progress,inspect:progress,
      all:()=>SPECS.map(spec=>snapshot(stateFor(spec))),
      completedCount:()=>completed.size,dispose});
  }
  global.CourtyardExplorationLevels = Object.freeze({SPECS,OBJECTIVES,makeStations,create,STORAGE_KEY,framework:FRAMEWORK,count:SPECS.length,version:'1.2.0'});
})(typeof window !== 'undefined' ? window : globalThis);
