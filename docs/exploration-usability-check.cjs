/* Real production event listeners and motor, using an explicitly modeled DOM.
 * No browser, CSS layout, rendered pixels, GPU or physical-device evidence.
 * Setup uses public safe destination travel; continuous tests never write player
 * coordinates or mutate host key sets, and use only dispatched keyboard input. */
'use strict';
const assert=require('node:assert/strict');
const MODES=['WALK','CAR','BOAT','FLY'];
const BLOCKED=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','KeyQ','ControlLeft','ControlRight','KeyE','KeyR','KeyF','KeyV','KeyB','Enter'];
const EPS=1e-7;
async function run(){
 const {loadHost}=require('./exploration-host.cjs');
 const h=await loadHost({events:true}),g=h.garden,w=g.exploration,d=h.document;
 assert(w,'production exploration initialized');assert.equal(h.logs.length,0,'no production initialization errors');
 const results=[],check=(name,fn)=>{fn();results.push(name);},step=(n=12)=>{for(let i=0;i<n;i++)w.tick(1/60);},position=()=>g.player.position.clone();
 const samePosition=(before,label)=>assert(g.player.position.distanceTo(before)<EPS,label+' '+g.player.position.distanceTo(before));
 const camera=()=>({yaw:g.cameraState.yaw,pitch:g.cameraState.pitch,distance:g.cameraState.distance});
 const key=(type,code,opts)=>h.dispatchKey(type,code,opts),press=(code,opts)=>{const e=key('keydown',code,opts);key('keyup',code,opts);return e;};
 function setup(mode){g.reader.close();if(w.atlasOpen)w.closeAtlas();if(!d.getElementById('directory').hidden)d.getElementById('close-directory').click();w.leaveLevel();assert(w.travel(0),'safe setup transfer');if(mode==='BOAT')assert(w.travelDock(w.docks[0].id),'safe dock setup');assert(w.chooseMode(mode),'setup '+mode);d.getElementById('world').focus();step(2);assert.equal(w.transport.snapshot().mode,mode);}
 g.start();
 check('adapter: capture, target, bubble, default prevention and propagation controls',()=>{
  const outer=d.createElement('div'),inner=d.createElement('button');outer.appendChild(inner);d.body.appendChild(outer);const order=[];
  const capture=()=>order.push('window-capture'),bubble=()=>order.push('window-bubble');h.context.addEventListener('probe',capture,true);h.context.addEventListener('probe',bubble);
  outer.addEventListener('probe',()=>order.push('outer-capture'),true);inner.addEventListener('probe',e=>{order.push('target');e.preventDefault();});outer.addEventListener('probe',()=>order.push('outer-bubble'));
  assert(h.dispatch(inner,'probe').defaultPrevented);assert.deepEqual(order,['window-capture','outer-capture','target','outer-bubble','window-bubble']);
  const stopped=[];inner.addEventListener('halt',e=>{stopped.push(1);e.stopPropagation();});inner.addEventListener('halt',()=>stopped.push(2));outer.addEventListener('halt',()=>stopped.push(3));h.dispatch(inner,'halt');assert.deepEqual(stopped,[1,2]);
  const immediate=[];inner.addEventListener('immediate',e=>{immediate.push(1);e.stopImmediatePropagation();});inner.addEventListener('immediate',()=>immediate.push(2));h.dispatch(inner,'immediate');assert.deepEqual(immediate,[1]);
  outer.hidden=true;assert.equal(inner.getClientRects().length,0,'hidden ancestor excludes descendant');outer.hidden=false;assert.equal(inner.closest('div'),outer);assert.equal(inner.nodeType,1);assert.equal(inner.ownerDocument,d);outer.remove();h.context.removeEventListener('probe',capture,true);h.context.removeEventListener('probe',bubble);
 });
 for(const mode of MODES){
  check(mode+': actual keydown drives continuous production movement',()=>{setup(mode);const before=position(),code=mode==='BOAT'?'KeyW':'KeyS';key('keydown',code);step(40);assert(g.player.position.distanceTo(before)>.1,'movement without injected coordinates '+mode);key('keyup',code);g.architectureQA.clear();});
  check(mode+': atlas blocks all 20 world keys, including jump/ascent/actions/mode/recovery',()=>{setup(mode);press('KeyM');assert(w.atlasOpen);const before=position(),view=camera(),active=w.activeLevel;for(const code of BLOCKED){const event=press(code,{target:d.getElementById('explore-chart')});assert(event.defaultPrevented,'atlas consumes '+code);step(2);samePosition(before,'modal key '+mode+'/'+code);assert.equal(w.transport.snapshot().mode,mode);assert.equal(w.activeLevel,active);assert.deepEqual(camera(),view);}press('Escape');assert(!w.atlasOpen);});
  check(mode+': stale movement repeats after atlas close cannot resume, fresh press can',()=>{setup(mode);const code=mode==='BOAT'?'KeyW':'KeyS';key('keydown',code);step(8);press('KeyM');press('Escape');const before=position();key('keydown',code,{repeat:true});step(40);samePosition(before,'stale held movement '+mode);key('keyup',code);key('keydown',code);step(40);assert(g.player.position.distanceTo(before)>.1,'fresh movement '+mode);key('keyup',code);g.architectureQA.clear();});
 }
 check('atlas: Escape and M close; focus restores to opener and Tab wraps both ways',()=>{
  setup('WALK');const opener=d.getElementById('explore-map-button');opener.focus();press('Enter');assert(w.atlasOpen);assert.equal(d.activeElement.id,'explore-close');
  const items=d.getElementById('explore-atlas').querySelectorAll('button,a').filter(x=>!x.disabled&&h.visible(x)),first=items[0],last=items.at(-1);last.focus();press('Tab');assert.equal(d.activeElement,first);press('Tab',{shiftKey:true});assert.equal(d.activeElement,last);first.focus();press('Tab');assert.equal(d.activeElement,items[1]);press('Escape');assert.equal(d.activeElement,opener);press('KeyM');assert(w.atlasOpen);assert(key('keydown','KeyM',{repeat:true}).defaultPrevented);assert(w.atlasOpen,'held M does not immediately close atlas');assert(key('keydown','Escape',{repeat:true}).defaultPrevented);assert(w.atlasOpen,'stale Escape does not close atlas');press('KeyM');assert(!w.atlasOpen);key('keydown','KeyM',{repeat:true});assert(!w.atlasOpen,'held M does not reopen atlas');key('keyup','KeyM');assert.equal(d.activeElement,opener);
 });
 check('atlas: modeled native Enter and Space button activation is preserved',()=>{
  setup('FLY');const opener=d.getElementById('explore-map-button');opener.focus();const enter=press('Enter');assert(!enter.defaultPrevented);assert(w.atlasOpen);const before=position();const space=press('Space');assert(!space.defaultPrevented);assert(!w.atlasOpen,'Space activates close button, not ascent');step(12);samePosition(before,'native button Space does not fly');
 });
 for(const trigger of ['reader','directory','blur','visibility'])for(const mode of MODES){
  setup(mode);const canvas=g.renderer.domElement,move=mode==='BOAT'?'KeyW':'KeyS',beforeLook=camera();
  h.dispatchPointer('pointerdown',{target:canvas,pointerId:21,clientX:800,clientY:500});h.dispatchPointer('pointermove',{target:canvas,pointerId:21,clientX:815,clientY:507});assert.notDeepEqual(camera(),beforeLook,'real look moved before '+trigger+' cancellation '+mode);key('keydown',move);if(mode==='FLY')h.dispatchPointer('pointerdown',{target:d.getElementById('explore-up'),pointerId:22});step(12);
  if(trigger==='reader'){assert.equal(await g.reader.open(6),true,'real reader loading');assert(d.querySelector('.ctw-workshop'),'unchanged typography workshop mounted');}
  if(trigger==='directory')d.getElementById('list-button').click();
  if(trigger==='blur')h.blur();if(trigger==='visibility')h.setVisibility(true);
  const before=position(),view=camera();step(12);samePosition(before,trigger+' pauses '+mode);assert.equal(w.transport.snapshot().speed,0);h.dispatchPointer('pointermove',{target:canvas,pointerId:21,clientX:950,clientY:700});assert.deepEqual(camera(),view,trigger+' cancels old look');
  if(trigger==='reader')g.reader.close();if(trigger==='directory')d.getElementById('close-directory').click();if(trigger==='visibility')h.setVisibility(false);
  const resumed=position();key('keydown',move,{repeat:true});if(mode==='FLY'){key('keydown','Space',{repeat:true});key('keydown','KeyQ',{repeat:true});}step(15);samePosition(resumed,trigger+' cancels stale held keys / ascent / inertia');key('keyup',move);key('keyup','Space');key('keyup','KeyQ');h.dispatchPointer('pointerup',{target:canvas,pointerId:21});h.dispatchPointer('pointerup',{target:d.getElementById('explore-up'),pointerId:22});
  key('keydown',move);step(40);assert(g.player.position.distanceTo(resumed)>.1,trigger+' fresh input restored '+mode);key('keyup',move);g.architectureQA.clear();results.push(mode+': '+trigger+' cancels inertia, held ascent, look and stale repeats; fresh input returns');
 }
 check('viewpad: repeated arrows remain camera control; stale Space/Q remain blocked',()=>{
  setup('FLY');const viewpad=d.getElementById('viewpad');viewpad.focus();const view=camera();key('keydown','ArrowRight',{repeat:true});assert(Math.abs(g.cameraState.yaw-view.yaw)>.1);key('keyup','ArrowRight');const before=position();key('keydown','Space',{repeat:true});step(15);samePosition(before,'viewpad stale Space');key('keydown','KeyQ',{repeat:true});step(15);samePosition(before,'viewpad stale Q');key('keyup','Space');key('keyup','KeyQ');d.getElementById('world').focus();key('keydown','Space');step(15);assert(g.player.position.y>before.y+.1,'fresh Space ascends');key('keyup','Space');g.architectureQA.clear();const high=position();key('keydown','KeyQ');step(10);assert(g.player.position.y<high.y-.1,'fresh Q descends');key('keyup','KeyQ');g.architectureQA.clear();
 });
 check('mode API: same and rejected transitions preserve view and position',()=>{
  for(const mode of MODES){setup(mode);g.cameraState.yaw=.42;g.cameraState.pitch=.37;g.cameraState.distance=11;const p=position(),view=camera();assert(w.chooseMode(mode));samePosition(p,'same mode');assert.deepEqual(camera(),view);assert.equal(w.chooseMode('INVALID'),false);samePosition(p,'invalid mode');assert.deepEqual(camera(),view);}
  setup('WALK');assert(w.enterLevel(0));const p=position(),view=camera();assert.equal(w.chooseMode('FLY'),false);samePosition(p,'level rejection');assert.deepEqual(camera(),view);w.leaveLevel();
 });
 check('mode UI: already-active CAR / BOAT / FLY buttons return to WALK',()=>{for(const mode of ['CAR','BOAT','FLY']){setup(mode);const b=d.querySelector('[data-travel="'+mode+'"]');assert(b);b.click();assert.equal(w.transport.snapshot().mode,'WALK',mode+' toggles out');}});
 check('level task disclosure: named control, aria state, and API agree',()=>{setup('WALK');assert(w.enterLevel(0));const toggle=d.getElementById('explore-task-toggle'),body=d.getElementById('explore-task-body');assert(toggle&&body);assert.equal(toggle.getAttribute('aria-controls'),body.id);assert.equal(w.taskExpanded,false);toggle.click();assert.equal(w.taskExpanded,true);assert.equal(toggle.getAttribute('aria-expanded'),'true');w.setTaskExpanded(false);assert.equal(toggle.getAttribute('aria-expanded'),'false');w.leaveLevel();});
 check('waypoints: track is non-teleporting, clears cleanly and guidance stays explicit',()=>{setup('WALK');const p=position();assert(w.track(1));samePosition(p,'tracking never moves visitor');const guide=w.guidance();assert(guide&&Number.isFinite(guide.distance));assert.equal(guide.id,w.places[1].id);w.clearWaypoint();assert.equal(w.guidance(),null);samePosition(p,'clearing never moves visitor');});
 const report={passed:true,evidence:'production event listeners, actual reader/workshop and production movement under an opt-in modeled DOM; inert renderer',checks:results.length,modalKeys:BLOCKED.length,modes:MODES,eventCount:h.events.length,results,limits:['No real-browser native-default verification, CSS/layout, pixels, WebGL, GPU timing or physical touch-device claim.','Continuous movement assertions use events only; public safe transfers are used for independent scenario setup.']};
 console.log(JSON.stringify(report,null,2));return report;
}

/* Source-derived geometry and visibility model copied into this maintained test.
 * Guarded against CSS drift; rectangles are formulas, NOT layout measurements.
 * --layout-only never imports or creates the production CPU/Three host. */
function runLayout(){
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const root=process.env.MASTERPLAN_ROOT?path.resolve(process.env.MASTERPLAN_ROOT):path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'assets/exploration-world.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('right:36px;top:105px;width:94px;height:75px'),'base desktop viewpad geometry');assert(html.includes('--joy-size:168px')&&html.includes('#sprint{width:92px;height:92px}'),'coarse desktop control geometry');assert(css.includes('.exploring .viewpad{top:100px}'),'desktop viewpad top');
for(const text of ['(orientation:landscape) and (max-height:740px)','@media(min-width:761px) and (min-height:741px)','width:360px;height:58px','right:calc(var(--sprint-right) + 298px);bottom:190px','max-height:80px;overflow:auto','#explore-level{max-height:calc(100dvh - 430px)}','--explore-bottom:max(20px,calc(12px + env(safe-area-inset-bottom)))','--explore-left:calc(max(34px,calc(12px + env(safe-area-inset-left))) + 122px)','--explore-right:calc(var(--sprint-right) + 180px)','(max-width:640px)','grid-template-columns:repeat(2,minmax(0,1fr));height:100px','bottom:calc(var(--explore-bottom) + 108px)','padding:8px 48px 8px 10px','padding:7px 48px 7px 10px','width:44px;min-height:44px!important','bottom:calc(max(46px,env(safe-area-inset-bottom)) + 170px)','bottom:calc(max(46px,env(safe-area-inset-bottom)) + 232px)','right:calc(var(--sprint-right) + 104px)','visibility:hidden','display:none!important'])assert(css.includes(text),'CSS model guard '+text);
const sizes=[[320,568],[390,600],[390,667],[568,320],[760,570],[760,571],[761,570],[761,571],[800,600],[844,390],[1024,768],[1440,900]],rows=[],cases=[];
const box=(id,x,y,w,h)=>({id,x,y,w,h});
for(const [w,h]of sizes)for(const bottom of[0,34])for(const left of(w>h?[0,44]:[0]))for(const right of(w>h?[0,44]:[0])){
 const desktop=w>=761&&h>=741,landscape=w>h&&h<=740,b=landscape?Math.max(20,12+bottom):Math.max(46,bottom),sr=Math.max(28,right),jl=Math.max(34,12+left),L=landscape?jl+122:14,R=landscape?sr+180:14,cw=w-L-R,th=landscape&&w<=640?100:54,cols=landscape&&w<=640?2:4,toolbar=box('toolbar',L,h-(landscape?b:b+170)-th,cw,th),task=box('task',L,landscape?66:194,cw,68),expanded=box('task-expanded',L,landscape?66:80,cw,h-(landscape?66:80)-(landscape?b:b+232)),guide=box('guidance',L,landscape?66:194,cw,landscape?h-66-b-th-8:88),untrack=box('untrack',L+cw-44,guide.y,44,44);
 if(desktop){Object.assign(toolbar,box('toolbar',(w-360)/2,h-30-58,360,58));Object.assign(task,box('task',w-30-280,285,280,h-430));Object.assign(expanded,{...task,id:'task-expanded'});Object.assign(guide,box('guidance',30,300,180,null),{heightNote:'Auto-height text; only the explicitly sized untrack target is modeled as interactive.'});Object.assign(untrack,box('untrack',30+180-44,300,44,44));}
 const row={w,h,left,right,bottom,landscape,desktop,toolbar,task,expanded,guidance:guide,untrack,bodyHeight:desktop?expanded.h:expanded.h-64};assert(row.bodyHeight>=140,'usable expanded task body '+JSON.stringify(row));rows.push(row);
 for(const mode of['WALK','CAR','BOAT','FLY'])for(const state of['roaming','destination','nearby','expanded']){
  const joySize=desktop?168:landscape?110:132;const boxes=[box('joystick',jl,h-(landscape?b:Math.max(46,12+bottom))-joySize,joySize,joySize)];
  if(mode==='FLY'){for(let i=0;i<2;i++)boxes.push(box('flight-'+i,w-sr-(desktop?298:0)-(desktop||landscape?92:78),h-(desktop?190:b)-112+i*60,desktop||landscape?92:78,52));}
  else{const sp=(desktop||landscape)&&w>=768?92:78;boxes.push(box('sprint',w-sr-sp,h-b-sp,sp,sp));if(mode==='WALK')boxes.push(box('jump',w-sr-(landscape||w>384?104:0)-64,h-b-(!landscape&&w<=384?90:0)-64,64,64));}
  if(!(state==='expanded'&&w<=760)){boxes.push(desktop?box('map',30,96,180,171):box('map',landscape?Math.max(12,left):14,landscape?66:82,landscape?110:132,44));boxes.push(desktop?box('look',w-36-94,100,94,75):box('look',w-(landscape?Math.max(16,right):16)-66,landscape?66:82,66,57));}
  if(!(landscape&&state==='expanded'))for(let i=0;i<4;i++){const bw=desktop?(360-14-18)/4:(cw-8-(cols-1)*4)/cols;boxes.push(desktop?box('mode-'+i,toolbar.x+7+i*(bw+6),toolbar.y+7,bw,44):box('mode-'+i,L+4+(i%cols)*(bw+4),toolbar.y+4+Math.floor(i/cols)*48,bw,44));}
  if(state==='destination')boxes.push(untrack);
  if(state==='nearby'||state==='expanded'){const q=state==='expanded'?expanded:task;if(desktop)boxes.push({...q,id:'task-scroll'});else{boxes.push(box('task-toggle',q.x+q.w-80,q.y+10,72,44));if(state==='expanded')boxes.push(box('task-scroll',q.x+10,q.y+56,q.w-20,q.h-64));}}
  for(const a of boxes){assert(a.w>=44&&a.h>=44,'minimum touch target '+JSON.stringify({row,mode,state,a}));assert(a.x>=0&&a.y>=0&&a.x+a.w<=w+.001&&a.y+a.h<=h+.001,'viewport containment '+JSON.stringify({row,mode,state,a}));}
  let pairs=0;for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];pairs++;assert(!(a.x<b.x+b.w-.01&&b.x<a.x+a.w-.01&&a.y<b.y+b.h-.01&&b.y<a.y+a.h-.01),'visible control overlap '+JSON.stringify({row,mode,state,a,b}));}
  cases.push({w,h,left,right,bottom,desktop,mode,state,pairs,boxes});
 }
}
const report={passed:true,evidence:'Source-formula and visibility model, not browser/device layout',cssSha256:crypto.createHash('sha256').update(css).digest('hex'),rows,cases,pairs:cases.reduce((n,c)=>n+c.pairs,0)};
const output=path.join(root,'qa-results/usability/layout-source.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,evidence:report.evidence,rows:rows.length,cases:cases.length,pairs:report.pairs}));return report;
}

module.exports={run,runLayout,MODES,BLOCKED};
if(require.main===module){
 if(process.argv.includes('--layout-only')){try{runLayout();}catch(error){console.error(error);process.exitCode=1;}}
 else run().catch(error=>{console.error(error);process.exitCode=1;});
}

