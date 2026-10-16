/* Source-backed, reversible in-world exhibit actions. No network, storage, account,
 * camera/microphone, DOM UI, navigation, or private/unpublished text is used here.
 * create({THREE,records,catalog,onSection,onPhase,onButterflyPhase,reducedMotion})
 * -> apply(buildingOrIndex,0|1|2), update(dt), describe(index), inspect(index), dispose().
 * Call update each frame. Reading surfaces are supplied by the host through onSection
 * or building.readingPanels.setSection; the host owns physical text rendering.
 */
(function (global) {
  'use strict';
  const SPECS = [{"index":0,"labels":["试写","框选","入格"],"sectionGroups":[["generation"],["annotation","workflow"],["archive"]],"kind":"ink","mechanism":"annotation-registration"},{"index":1,"labels":["馆藏","轮廓","遮罩"],"sectionGroups":[["collection"],["restoration"],["mask","parameters"]],"kind":"conservation","mechanism":"same-frame-conservation-layers"},{"index":2,"labels":["入口","透见","同馆"],"sectionGroups":[["same-platform"],["shared-content"],["boundary"]],"kind":"secondary-entry","mechanism":"secondary-entrance-light-filter"},{"index":3,"labels":["全幅","暂停·续播","重放"],"sectionGroups":[["whole-picture"],["four-stages"],["boundary"]],"kind":"process","mechanism":"conservation-process-revisit"},{"index":4,"labels":["守护","留言","回应"],"sectionGroups":[["family-desk"],["messages"],["two-sides"]],"kind":"care-relay","mechanism":"domestic-acoustic-enclosure"},{"index":5,"labels":["连接","四项","往返"],"sectionGroups":[["connected"],["four-actions"],["roles"]],"kind":"elder-controls","mechanism":"reachable-elder-controls"},{"index":6,"labels":["取样","编排","校看"],"sectionGroups":[["input"],["editing","modes"],["boundary"]],"kind":"layout","mechanism":"publishing-mode-selection"},{"index":7,"labels":["入册","比照","归档"],"sectionGroups":[["patent"],["classification","trademark"],["archive","example"]],"kind":"album","mechanism":"album-page-comparison"},{"index":8,"labels":["入口","未读","边界"],"sectionGroups":[["entry"],["unknown"],["boundary"]],"kind":"public-entry","mechanism":null},{"index":9,"labels":["入口","身份","边界"],"sectionGroups":[["entry"],["identity"],["boundary"]],"kind":"public-entry","mechanism":null},{"index":10,"labels":["路由","往返","观察"],"sectionGroups":[["three-steps"],["example"],["metrics"]],"kind":"api-route","mechanism":"content-articulation"},{"index":11,"labels":["定位","未读","边界"],"sectionGroups":[["identity"],["unknown"],["boundary"]],"kind":"public-entry","mechanism":null},{"index":12,"labels":["匿名","短显","归隐"],"sectionGroups":[["privacy"],["events","local-demo"],["boundary"]],"kind":"privacy-window","mechanism":"time-limited-privacy-shutter"},{"index":13,"labels":["人的线","逐节","自持"],"sectionGroups":[["opening"],["s1","s2","s3","s4","s5","s6","s7","s8","s9","s10"],["s10","source-note"]],"kind":"narrative","mechanism":"tool-layer-comparison"},{"index":14,"labels":["总览","十二传","留痕"],"sectionGroups":[["opening"],["biography-01","biography-02","biography-03","biography-04","biography-05","biography-06","biography-07","biography-08","biography-09","biography-10","biography-11","biography-12"],["biography-11","source-note"]],"kind":"narrative","mechanism":"relationship-sightlines"},{"index":15,"labels":["来路","三结","延续"],"sectionGroups":[["causal-diagram"],["chapter-01","chapter-02","chapter-03"],["chapter-03","source-note"]],"kind":"narrative","mechanism":"cross-court-light"},{"index":16,"labels":["雨巷","共建","晴庭"],"sectionGroups":[["route-map","c1","c2","c3"],["c4","c5","c6","c7","c8"],["c9","c10","c11"]],"kind":"narrative","mechanism":"rain-to-sun-sightline"},{"index":17,"labels":["各自","四语","并肩"],"sectionGroups":[["o1","o2"],["o3","o4","o5","o6"],["o7","o8"]],"kind":"narrative","mechanism":"reciprocal-registers"},{"index":18,"labels":["母题","五稿","未完"],"sectionGroups":[["version-tree","c1"],["c2","c3","c4","c5","c6"],["c7","c8"]],"kind":"narrative","mechanism":"retained-revision-comparison"},{"index":19,"labels":["接件","共作","交接"],"sectionGroups":[["s01-一-我离开的时候-最先想起的不是荣誉-而是一条消","s02-二-青媒不是一个-写稿组织-它是一个小型生产系统","s03-三-我第一次真正意识到-负责人-不是一个称呼"],["s04-四-我在青媒学会的-不是怎么写漂亮话-而是怎么让","s05-五-我见过青媒最好的样子-是大家在混乱里仍然愿意","s06-六-青媒让我明白-所谓-能力-很多时候是对麻烦的","s07-七-关于-AI-和工具-我不想把它们当成炫技-而"],["s09-九-如果要说我留下了什么","s10-十-写给下一届-不要只继承任务-也要继承判断","s12-十二-离开不是把自己摘出去-而是把路标留下来","s13-十三-我愿意留下的几条具体原则","s15-十五-最后的交接清单"]],"kind":"handover","mechanism":"service-light-transfer"},{"index":20,"labels":["收窗","借景","通明"],"sectionGroups":[["preface","c1","c2","c3","c4"],["c5","c6"],["c7","c8","c9","c10"]],"kind":"integrated-garden","mechanism":"sliding-garden-lattice"},{"index":21,"labels":["毛稿","共修","页边"],"sectionGroups":[["draft","first-proof"],["red-pencil","revision","columns"],["margin","final-proof","outside-page"]],"kind":"narrative","mechanism":"retained-layer-reveal"},{"index":22,"labels":["原件","比照","未决"],"sectionGroups":[["case-intro","case-workflow"],["case-repair","report-process-repair"],["report-limits","report-next"]],"kind":"evidence-overlay","mechanism":"reversible-overlay-translation"},{"index":23,"labels":["展翼","半展","收翼"],"sectionGroups":[["chapter-4"],["chapter-6"],["afterword"]],"kind":"butterfly","mechanism":null},{"index":24,"labels":["开始","暂停·续行","结束"],"sectionGroups":[["daily"],["time"],["local"]],"kind":"quiet-timer","mechanism":"content-articulation"},{"index":25,"labels":["试墨","活字","接续"],"sectionGroups":[["brush"],["tools"],["research","forks","rights"]],"kind":"maker","mechanism":"shallow-exploded-joint"}];
  const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
  const clockText = seconds => {const whole=Math.ceil(Math.max(0,seconds));return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');};
  function create(options) {
    const T = options.THREE;
    if (!T) throw new Error('CourtyardBuildingActions requires THREE');
    const records = options.records || [], catalog = options.catalog || global.CourtyardReadingCatalog || {};
    const states = new Map(), disposed = {value: false};
    const now = () => typeof options.now === 'function' ? options.now() : Date.now()/1000;
    const isReduced = () => typeof options.reducedMotion === 'function' ? options.reducedMotion() : !!options.reducedMotion;
    const resolve = input => typeof input === 'number' ? records.find(b => Number(b.index ?? b.metadata?.index) === input) : input;
    const indexOf = input => typeof input === 'number' ? input : Number(input?.index ?? input?.metadata?.index);
    const sourceGroups = spec => spec.sectionGroups.map(ids => ids.filter(id => (catalog[spec.index]?.sections || []).some(section => section.id === id)));
    function stateFor(input) {
      const index = indexOf(input), spec = SPECS[index];
      if (!spec) return null;
      if (states.has(index)) return states.get(index);
      const b = resolve(input), groups = sourceGroups(spec);
      const s = {index, spec, building: b, groups, phase: -1, counts: [0,0,0], sectionId: null,
        elapsed: 0, remaining: 180, playing: false, progress: 0, seed: 0, template: 0,
        archived: [], owned: [], restores: [], materialRestores: [], visibilityOwned: new Set(), sheet: null, signal: null, lastTick: now(),
        mechanism: null, mechanismValue: 0, mechanismBound: false, revision: 0, availability: []};
      if (b && spec.mechanism) {
        s.mechanism = (b.mechanisms || []).find(m => m.kind === spec.mechanism);
        // Select by exact authored kind and expected object, never by arbitrary first vent.
        if (s.mechanism && (index === 10 || index === 24)) {
          const expected = index === 10 ? 'two-model-route-louvres' : 'contemplative-light-baffles';
          if (s.mechanism.object?.name !== expected) {
            s.mechanism = (b.mechanisms || []).find(m => m.object?.name === expected) || s.mechanism;
          }
        }
      }
      states.set(index, s); return s;
    }
    function bindMechanism(s) {
      if (!s.mechanism || s.mechanismBound) return;
      const m = s.mechanism, original = m.update, originalValue = Number.isFinite(m.openness) ? m.openness : 0;
      if (typeof original !== 'function') return;
      const wrapped = function (_globalValue, dt) {return original.call(this, s.mechanismValue, dt);};
      m.update = wrapped; s.mechanismBound = true;
      s.restores.push(() => {if (m.update === wrapped) {m.update = original; original.call(m, originalValue);}});
    }
    function setMechanism(s, value, snap = true) {
      s.mechanismValue = clamp(value); bindMechanism(s);
      if (snap && s.mechanism) {
        if (typeof s.mechanism.articulate === 'function') s.mechanism.articulate(s.mechanismValue);
        else if (typeof s.mechanism.update === 'function') s.mechanism.update(s.mechanismValue);
      }
    }
    function rememberVisibility(s, object) {
      if (!object || s.visibilityOwned.has(object)) return;
      const before = object.visible; s.visibilityOwned.add(object);
      s.restores.push(() => {object.visible = before;});
    }
    function visible(s, object, value) {if (object) {rememberVisibility(s, object); object.visible = value;}}
    function restoreFocus(s) {s.materialRestores.splice(0).forEach(fn => fn());}
    function focus(s, objects) {
      restoreFocus(s);
      for (const object of (Array.isArray(objects) ? objects : [objects]).filter(Boolean)) object.traverse(mesh => {
        if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return;
        const original = mesh.material, material = original.clone();
        if (material.emissive) {material.emissive.setHex(0x725126); material.emissiveIntensity = .32;}
        mesh.material = material;
        s.materialRestores.push(() => {if (mesh.material === material) mesh.material = original; material.dispose();});
      });
    }
    function sheet(s, position, size) {
      if (s.sheet) return s.sheet;
      if (!s.building?.root || !global.document?.createElement) return null;
      const canvas = global.document.createElement('canvas'); canvas.width = 768; canvas.height = 512;
      const ctx = canvas.getContext('2d'); if (!ctx) return null;
      const texture = new T.CanvasTexture(canvas); texture.encoding = T.sRGBEncoding; texture.anisotropy = 2;
      const material = new T.MeshStandardMaterial({map: texture, roughness: .94, metalness: 0, side: T.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2});
      const geometry = new T.PlaneGeometry(size[0], size[1]), mesh = new T.Mesh(geometry, material);
      mesh.name = 'local-exhibit-paper-'+s.index; mesh.position.set(...position); mesh.rotation.x = -Math.PI/2;
      mesh.userData.localExhibit = {index:s.index,source:'existing-public-catalog',noExternalRequest:true};
      (s.building.detail || s.building.root).add(mesh); s.owned.push(mesh);
      s.sheet = {canvas,ctx,texture,mesh,geometry,material,revision:0}; return s.sheet;
    }
    function paint(s, title, draw) {
      const p = s.sheet; if (!p) return;
      const c = p.ctx; c.clearRect(0,0,768,512); c.fillStyle = '#e8e0cc'; c.fillRect(0,0,768,512);
      c.fillStyle = '#35413e'; c.font = '27px "Noto Serif SC", serif'; c.textAlign = 'left'; c.fillText(title,30,44);
      c.strokeStyle = '#ad9a76'; c.lineWidth = 1; c.beginPath(); c.moveTo(30,62); c.lineTo(738,62); c.stroke();
      draw(c); c.font = '16px sans-serif'; c.fillStyle = '#75674f'; c.fillText('本地展陈示意 · 不连接原服务',30,488);
      p.texture.needsUpdate = true; p.revision++; s.revision++;
    }
    function strokeStudy(c, seed, x=160, y=96, scale=1) {
      c.save(); c.translate(x,y); c.scale(scale,scale); c.strokeStyle = '#273735'; c.lineCap = 'round';
      // A real local procedural pressure stroke, not generated prose or an AI result.
      const paths=[[[0,20],[2,180],[132,178]],[[63,-6],[62,178]],[[134,38],[133,179]]];
      paths.forEach((path,n)=>{
        for(let j=1;j<path.length;j++) for(let k=0;k<18;k++) {
          const a=path[j-1],b=path[j],t=k/18,u=(k+1)/18;
          const jitter=Math.sin((k+seed)*2.1+n)*1.4;
          c.lineWidth=5+Math.sin(t*Math.PI)*10+(seed%4)*.6;
          c.beginPath();c.moveTo(a[0]+(b[0]-a[0])*t+jitter,a[1]+(b[1]-a[1])*t);
          c.lineTo(a[0]+(b[0]-a[0])*u+jitter,a[1]+(b[1]-a[1])*u);c.stroke();
        }
      }); c.restore();
    }
    function drawInk(s) {
      paint(s, ['试写：笔压变化','框选：边界改变读法','入格：本次试写索引'][s.phase], c => {
        if(s.phase<2) {
          strokeStudy(c,s.seed,190,116,1.25);
          c.font='22px serif';c.fillText('山',535,160);c.font='18px sans-serif';c.fillText('固定字形 · 第 '+s.seed+' 次试写',475,204);
          if(s.phase===1) {
            c.strokeStyle='#93644c';c.lineWidth=3;
            if(s.counts[1]%2) c.strokeRect(166,95,235,270);
            else {c.beginPath();[[178,117],[281,93],[414,156],[390,372],[166,348]].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();}
            c.fillText(s.counts[1]%2?'矩形范围':'多边形范围',475,252);
          }
        } else s.archived.forEach((seed,n)=>{c.strokeStyle='#ae9c7f';c.strokeRect(45+n*238,90,210,335);strokeStudy(c,seed,77+n*238,125,1);c.font='18px sans-serif';c.fillText('本地样张 '+seed,68+n*238,391);});
      });
    }
    function drawLayout(s) {
      const modes=['日常','三下乡','寒假实践','转载'];
      paint(s,['取样：同一份公开示意材料','编排：'+modes[s.template]+'版式','校看：标题 / 正文 / 图注 / 来源'][s.phase],c=>{
        c.fillStyle='#30413c';
        if(s.phase===0){c.font='25px serif';['庭院手记','树影落在纸上。','翻到下一页，继续观察。','图注：庭中树影','来源：本地固定示例'].forEach((line,n)=>c.fillText(line,56+(n%2)*32,118+n*65));return;}
        // Same fixed material, four genuinely different page compositions:
        // column / photo-led field report / image-sidebar report / attributed extract.
        const layouts=[
          {title:[64,128,36],body:[[64,183],[64,230]],image:[64,260,590,108],caption:[64,395],source:[64,432],bars:[[64,84,590,7]]},
          {title:[64,265,34],body:[[64,312],[64,351]],image:[64,83,640,112],caption:[64,221],source:[64,433],bars:[[64,374,640,3]]},
          {title:[64,128,32],body:[[64,186],[64,233]],image:[452,94,244,184],caption:[452,303],source:[64,426],bars:[[64,84,334,7],[64,362,632,3]]},
          {title:[104,127,34],body:[[122,204],[122,251]],image:[104,296,215,87],caption:[342,335],source:[104,435],bars:[[100,164,7,112],[104,409,568,3]]}
        ];
        const layout=layouts[s.template];
        c.fillStyle=s.template===1?'#7c5d45':'#3e5851';layout.bars.forEach(r=>c.fillRect(...r));
        c.fillStyle='#bdc2b0';c.fillRect(...layout.image);
        c.fillStyle='#30413c';c.font=layout.title[2]+'px serif';c.fillText('庭院手记',layout.title[0],layout.title[1]);
        c.font='23px serif';['树影落在纸上。','翻到下一页，继续观察。'].forEach((line,n)=>c.fillText(line,...layout.body[n]));
        c.fillStyle='#40524a';c.font='17px serif';c.fillText('图注：庭中树影',...layout.caption);c.fillText('来源：本地固定示例',...layout.source);
        if(s.phase===2){
          c.strokeStyle='#806949';c.lineWidth=2;
          const boxes=[[layout.title[0]-7,layout.title[1]-layout.title[2],170,layout.title[2]+12],
            [layout.body[0][0]-7,layout.body[0][1]-27,326,layout.body[1][1]-layout.body[0][1]+38],
            [layout.caption[0]-7,layout.caption[1]-21,180,30],[layout.source[0]-7,layout.source[1]-21,204,30]];
          boxes.forEach(r=>c.strokeRect(...r));c.font='17px sans-serif';c.fillText('✓ 层级   ✓ 图注   ✓ 来源',430,460);
        }
      });
    }
    function makeSignal(s, y, z) {
      if(s.signal||!s.building?.root)return s.signal;
      const group=new T.Group();group.name='anonymous-local-signal-'+s.index;group.position.set(4.5,y,z);
      const base=new T.MeshStandardMaterial({color:0x8b795e,roughness:.7});
      const geometry=new T.SphereGeometry(.10,8,6),nodes=[];
      for(const x of [-.7,.7]){const m=new T.Mesh(geometry,x<0?base:base.clone());m.position.x=x;group.add(m);nodes.push(m);}
      const token=new T.Mesh(new T.SphereGeometry(.055,8,6),new T.MeshStandardMaterial({color:0xd6ad73,emissive:0x866334,emissiveIntensity:.5}));
      group.add(token);s.building.root.add(group);s.owned.push(group);s.signal={group,nodes,token};return s.signal;
    }
    function drawSmall(s) {
      const titles={3:'四步过程 · '+['微吸去尘','无接触成像','纸张补缺','间接润展'][Math.min(3,Math.floor(s.progress*4))],
        4:['日常守护','无内容留言示意','回应示意'][s.phase],5:['连接说明','四项可达','往返信号'][s.phase],
        7:['关键词入册','分类 / 商标比照','准备材料归档'][s.phase],10:['端点路线','本地往返','指标缺省'][s.phase],
        12:['匿名姿态','限时事件','回到匿名'][s.phase],24:'安静停留 · '+clockText(s.remaining)};
      paint(s,titles[s.index]||'本地示意',c=>{
        c.font='25px serif';
        if(s.index===3){['1 微吸去尘','2 无接触成像','3 纸张补缺','4 间接润展'].forEach((t,n)=>{c.fillStyle=n===Math.min(3,Math.floor(s.progress*4))?'#896243':'#506057';c.fillText(t,65,122+n*65);});c.font='18px sans-serif';c.fillText(s.playing?'播放中':'已停留',540,406);}
        if(s.index===4||s.index===5){c.fillText(s.index===4?'家庭侧 ↔ 长者侧':'设备 ↔ 家庭侧',76,140);c.fillText('示意端点，不是实时状态',76,200);if(s.index===5)c.fillText(['看 · 识物入口','听 · 留言入口','说 · 留言入口','聊 · 通话入口'][(s.counts[1]-1+4)%4],76,277);c.fillText('无录音，无个人信息',76,348);}
        if(s.index===7){c.fillText('portable blender',60,132);c.fillText(['关键词 → 技术分类','专利 / 商标 → 来源比照','项目背景 + 待检索来源'][s.phase],60,211);c.fillStyle='#8b644e';c.fillText('待实际检索 · 没有鉴定结论',60,313);}
        if(s.index===10){c.fillText((s.counts[0]%2?'openai':'anthropic')+' → 兼容端点 → 模型路由',43,140);c.font='22px serif';c.fillText(s.phase===2?'成功率 —   延迟 —   吞吐 —':'应用 → 路由 → 响应形状',43,223);c.fillStyle='#846546';c.fillText('未发送请求 · 不产生模型输出',43,337);}
        if(s.index===12){c.fillText(s.phase===1&&s.playing?'示意事件剩余 '+Math.ceil(s.remaining)+' 秒':'匿名几何姿态',66,133);c.strokeStyle='#53675d';c.lineWidth=7;c.beginPath();c.arc(375,198,20,0,Math.PI*2);c.moveTo(375,222);c.lineTo(375,312);c.moveTo(313,270);c.lineTo(375,245);c.lineTo(437,270);c.moveTo(338,379);c.lineTo(375,312);c.lineTo(412,379);c.stroke();c.font='19px serif';c.fillText('未接入影像 · 未启用摄像头',60,424);}
        if(s.index===24){c.font='80px serif';c.fillText(clockText(s.remaining),210,232);c.font='24px serif';c.fillText(s.playing?'计时中，可随时暂停':'静止，按开始重新计时',130,324);c.font='18px serif';c.fillText('自选安静停留，不提供医疗评估',120,405);}
      });
    }
    function narrativeFocus(s) {
      const object=s.mechanism?.object;if(!object)return;
      const parts=object.children;
      if(s.phase===0){focus(s,parts.length?[parts[0]]:object);return;}
      if(s.phase===2){
        if(s.index===13)focus(s,parts[9]);
        else if(s.index===14)focus(s,parts[10]);
        else if(s.index===15||s.index===17)focus(s,parts.slice(-2));
        else focus(s,parts);
        return;
      }
      const n=(s.counts[s.phase]-1)%Math.max(1,parts.length);
      if(s.index===15||s.index===17){const pair=((s.counts[s.phase]-1)%Math.max(1,parts.length/2))*2;focus(s,parts.slice(pair,pair+2));}
      else focus(s,parts[n]||object);
    }
    function runAction(s) {
      const p=s.phase, b=s.building, obj=s.mechanism?.object;
      s.elapsed=0;s.progress=0;s.playing=false;s.lastTick=now();
      switch(s.spec.kind){
        case 'ink':
          sheet(s,[-4.8,1.105,-5.95],[2.75,1.53]);
          if(p===0)s.seed++;if(!s.seed)s.seed=1;
          if(p===2){s.archived.push(s.seed);s.archived=s.archived.slice(-3);}
          setMechanism(s,p/2);drawInk(s);break;
        case 'conservation':
          setMechanism(s,p/2);if(obj){visible(s,obj.children[0],p>0);visible(s,obj.children[1],p===2);if(p===2)obj.children[1]?.children.slice(5).forEach((part,n)=>visible(s,part,n===(s.counts[2]-1)%3));focus(s,p===2?obj.children[1]:p===1?obj.children[0]:null);}break;
        case 'secondary-entry':
          setMechanism(s,p/2);if(obj)focus(s,p===1?obj.children.filter((_,i)=>i%3===0):p===2?obj.children:[]);break;
        case 'process':
          sheet(s,[4.55,1.125,-6.6],[2.20,1.85]);
          if(p===1){s.playing=!s.wasPlaying;s.progress=s.previousProgress;}else if(p===2)s.playing=true;
          setMechanism(s,s.progress);drawSmall(s);break;
        case 'care-relay':case 'elder-controls':
          if(s.index===4){const page=sheet(s,[-4.75,1.55,-5.68],[3.12,1.13]);if(page)page.mesh.rotation.set(0,Math.PI,0);}
          else {const page=sheet(s,[4.65,1.2,-4.66],[2.18,.62]);const lectern=obj?.children[1];if(page&&lectern){lectern.add(page.mesh);page.mesh.position.set(0,.12,0);}}
          makeSignal(s,s.index===4?1.09:1.27,s.index===4?4.35:-4.68);s.playing=p>0;s.direction=p===2?-1:1;
          if(s.signal){s.signal.token.visible=p>0;s.signal.token.position.x=s.direction>0?-.7:.7;}
          setMechanism(s,p/2);if(s.spec.kind==='elder-controls'&&obj)focus(s,p===1?obj.children[(s.counts[1]-1+4)%Math.max(1,obj.children.length)]:[]);
          drawSmall(s);break;
        case 'layout':
          {const page=sheet(s,[-4.85,2.35,6.294],[3.29,2.69]);if(page)page.mesh.rotation.set(0,Math.PI,0);}if(p===1)s.template=(s.counts[1]-1)%4;
          setMechanism(s,p/2);drawLayout(s);break;
        case 'album':
          sheet(s,[-5.35,1.19,-5.6],[2.43,.8]);setMechanism(s,p/2);
          if(obj)focus(s,p===1?obj.children.slice(((s.counts[1]-1)%4)*2,((s.counts[1]-1)%4)*2+2):[]);drawSmall(s);break;
        case 'public-entry':
          // The host turns a verified public source leaf. No private-room mockup.
          break;
        case 'api-route':
          sheet(s,[-5.9,1.16,.55],[2.85,1.05]);makeSignal(s,5.13,-5.6);
          s.playing=p===1;if(s.signal)s.signal.token.visible=p===1;setMechanism(s,p/2);drawSmall(s);break;
        case 'privacy-window':
          sheet(s,[-6.2,.826,3.65],[2.4,1.18]);s.remaining=p===1?8:0;s.playing=p===1;
          setMechanism(s,p===1?.5:0);drawSmall(s);break;
        case 'narrative':
          setMechanism(s,p/2);narrativeFocus(s);break;
        case 'handover': {
          // Continue from the actual carriage, including re-selection mid-transfer.
          // Reduced motion is a user-triggered static end state, never a running tween.
          const current=Number.isFinite(s.mechanism?.openness)?s.mechanism.openness:s.previousProgress;
          s.progress=p===1?(isReduced()?.75:clamp(current)):p/2;
          s.playing=p===1&&!isReduced()&&Math.abs(s.progress-.75)>1e-9;
          setMechanism(s,s.progress);focus(s,obj);break;
        }
        case 'integrated-garden': {
          setMechanism(s,p/2);
          const names=['poem-in-the-entry-wall','self-cultivation-at-the-turn','everyday-ending-beside-the-frame'];
          focus(s,b?.root?.getObjectByName(names[p]));break;
        }
        case 'evidence-overlay':
          setMechanism(s,p===0?0:p===1?.5:1);visible(s,obj,p>0);focus(s,p>0?obj:null);break;
        case 'butterfly':
          if(typeof options.onButterflyPhase==='function')options.onButterflyPhase(p,['open','half','closed'][p]);break;
        case 'quiet-timer':
          sheet(s,[4.8,.848,-6.0],[1.92,.95]);
          if(p===0){s.remaining=180;s.playing=true;}else if(p===1){s.playing=!s.wasPlaying;s.remaining=s.previousRemaining;}else{s.remaining=180;s.playing=false;}
          setMechanism(s,s.playing?.5:0);drawSmall(s);break;
        case 'maker':
          sheet(s,[5.35,1.155,.85],[3.34,2.52]);setMechanism(s,p===2?1:0);
          if(p<2)paint(s,p===0?'手艺：本地笔压试验':'活字：本地重排示意',c=>{
            if(p===0)strokeStudy(c,++s.seed,280,116,1.25);
            else {c.font='54px serif';const characters=['山','水','庭','院'];characters.forEach((ch,n)=>{const col=(n+s.counts[1])%4;c.fillText(ch,86+col*151,165+(col%2)*85);});c.font='22px serif';c.fillText('固定示例字 · 再按一次重新编排',132,382);}
          });else paint(s,'接续：来源、工程与使用边界',c=>{c.font='25px serif';['公开目录 → 项目来源','上游 Fork → 保留归属','可读源码 ≠ 已获复用许可'].forEach((t,n)=>c.fillText(t,65,143+n*95));});break;
      }
    }
    function apply(input, phase) {
      if(disposed.value)return {ok:false,reason:'disposed'};
      if(!Number.isInteger(phase)||phase<0||phase>2)return {ok:false,reason:'phase must be 0, 1, or 2'};
      const s=stateFor(input);if(!s)return {ok:false,reason:'unknown building'};
      s.wasPlaying=s.playing;s.previousProgress=s.progress;s.previousRemaining=s.remaining;
      s.phase=phase;s.counts[phase]++;const ids=s.groups[phase];
      s.sectionId=ids.length?ids[(s.counts[phase]-1)%ids.length]:null;
      runAction(s);
      let read=false;
      if(s.sectionId){
        if(typeof options.onSection==='function'){read=options.onSection(s.index,s.sectionId,phase)!==false;}
        else if(s.building?.readingPanels?.setSection){read=s.building.readingPanels.setSection(s.sectionId)!==false;}
      }
      if(typeof options.onPhase==='function')options.onPhase(s.index,phase);
      const result={ok:!!s.building||s.spec.kind==='butterfly',index:s.index,phase,sectionId:s.sectionId,
        label:s.spec.labels[phase],kind:s.spec.kind,readableSection:read,localOnly:true,
        mechanism:!!s.mechanism,physicalSheet:!!s.sheet,playing:s.playing,revision:s.revision,
        effectAvailable:!!s.mechanism||!!s.sheet||read||(s.spec.kind==='butterfly'&&typeof options.onButterflyPhase==='function')};
      if(s.building)s.building.userActionState=result;return result;
    }
    function update(dt) {
      if(disposed.value)return;dt=clamp(Number(dt)||0,0,1);
      for(const s of states.values()){
        if(!s.playing)continue;const wallStep=Math.max(dt,Math.max(0,now()-s.lastTick));s.lastTick=now();s.elapsed+=dt;
        if(s.spec.kind==='process'){
          const old=Math.min(3,Math.floor(s.progress*4));s.progress=clamp(s.progress+dt/16);
          setMechanism(s,isReduced()?Math.min(3,Math.floor(s.progress*4))/3:s.progress);
          if(old!==Math.min(3,Math.floor(s.progress*4))||s.progress===1)drawSmall(s);
          if(s.progress===1)s.playing=false;
        }else if(s.spec.kind==='privacy-window'){
          const old=Math.ceil(s.remaining);s.remaining=Math.max(0,s.remaining-wallStep);
          if(!s.remaining){s.playing=false;setMechanism(s,0);}
          if(old!==Math.ceil(s.remaining))drawSmall(s);
        }else if(s.spec.kind==='quiet-timer'){
          const old=Math.ceil(s.remaining);s.remaining=Math.max(0,s.remaining-wallStep);
          setMechanism(s,isReduced()?.5:(.5-.5*Math.cos(s.elapsed*Math.PI/4)));
          if(!s.remaining){s.playing=false;setMechanism(s,0);}
          if(old!==Math.ceil(s.remaining))drawSmall(s);
        }else if(s.spec.kind==='handover'){
          const distance=.75-s.progress;
          s.progress=isReduced()?.75:s.progress+Math.sign(distance)*Math.min(Math.abs(distance),dt/24);
          setMechanism(s,s.progress);if(Math.abs(s.progress-.75)<1e-9)s.playing=false;
        }else if(s.signal){
          const duration=s.spec.kind==='api-route'?4:3,t=clamp(s.elapsed/duration);
          const bounce=s.spec.kind==='api-route'?(t<.5?t*2:2-t*2):t;
          s.signal.token.position.x=isReduced()?(t<.5?-.7:.7):((s.direction===-1?1-bounce:bounce)*1.4-.7);
          if(t===1)s.playing=false;
        }
      }
    }
    function inspect(index) {
      const s=states.get(Number(index));if(!s)return null;
      return {index:s.index,phase:s.phase,counts:s.counts.slice(),sectionId:s.sectionId,kind:s.spec.kind,
        playing:s.playing,elapsed:s.elapsed,remaining:s.remaining,progress:s.progress,seed:s.seed,template:s.template,
        archived:s.archived.slice(),mechanismValue:s.mechanismValue,sheetRevision:s.sheet?.revision||0,
        ownedObjects:s.owned.map(o=>o.name),sourceGroups:s.groups.map(g=>g.slice())};
    }
    function dispose(){
      if(disposed.value)return;disposed.value=true;
      for(const s of states.values()){
        restoreFocus(s);s.restores.reverse().forEach(fn=>fn());
        const materials=new Set(), geometries=new Set();
        for(const object of s.owned){object.parent?.remove(object);object.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});}
        s.sheet?.texture.dispose();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
      }states.clear();
    }
    return {apply,update,inspect,dispose,describe(index){const spec=SPECS[Number(index)];return spec?{index:spec.index,labels:spec.labels.slice(),actions:spec.labels.map((label,phase)=>({label,description:label+' · '+(sourceGroups(spec)[phase].map(id=>(catalog[spec.index]?.sections||[]).find(x=>x.id===id)?.title).filter(Boolean).join(' / '))})),kind:spec.kind,sectionGroups:sourceGroups(spec)}:null;}};
  }
  global.CourtyardBuildingActions = Object.freeze({create,version:'1.0.0',count:26});
})(typeof window!=='undefined'?window:globalThis);
