/* Local-only repeatable QA, invoked by the visible Run button. */
const frame=document.getElementById('frame'),status=document.getElementById('status');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const localReporter=['localhost','127.0.0.1'].includes(location.hostname);
let mode='desktop';
document.getElementById('narrow').onclick=()=>{mode='narrow';frame.style.width='390px';frame.style.height='844px';frame.src='../index.html?architectureQA=1&view=narrow';status.textContent='Loading narrow viewport';};
document.getElementById('desktop').onclick=()=>{mode='desktop';frame.style.width='1280px';frame.style.height='900px';frame.src='../index.html?architectureQA=1';status.textContent='Loading desktop viewport';};
frame.onload=()=>{status.textContent=frame.contentWindow.__garden?'Courtyard ready. Run tests when ready.':'Waiting for courtyard initialization';};
async function persist(name,data){if(!localReporter)return;const body=typeof data==='string'?{name,text:data}:{name,base64:data};await fetch('/__qa_artifact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
document.getElementById('run').onclick=async()=>{
 const w=frame.contentWindow,g=w.__garden,report={mode,at:new Date().toISOString(),buildings:[],checks:[],errors:[],screenshots:[]};
 if(!g?.architectureQA){status.textContent='Architecture test API not ready';return;}
 const a=g.architectureQA,assert=(ok,label,detail)=>{report.checks.push({label,passed:!!ok,detail});if(!ok)report.errors.push(label);};
 async function shot(name){if(!localReporter)return;if(!['court-overview','mechanical-butterfly','inner-biological-butterfly','exterior-0','interior-20'].includes(name))return;g.__w2bTest('render');const uri=g.renderer.domElement.toDataURL('image/png');await fetch('/__qa_artifact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:mode+'-'+name+'.png',base64:uri.split(',')[1]})});report.screenshots.push(mode+'-'+name+'.png');}
 try{
  g.start();g.setSky(.28);g.__w2bTest('prepare');
  assert(a.buildings.length===28,'25 buildings and 3 math pavilions exist',a.buildings.length);
  for(const b of a.buildings){
   status.textContent='Testing '+b.title+' ('+(report.buildings.length+1)+'/28)';
   const front=b.point(0,-b.depth/2-2),back=b.point(0,b.depth/2+2);
   g.teleport(front.x,front.z);g.cameraState.yaw=b.yaw+Math.PI;g.cameraState.pitch=.12;g.cameraState.distance=6.5;
   a.clear();let minProgress=Infinity,maxStep=0,previous=g.player.position.clone();
   for(let i=0;i<Math.ceil((b.depth+4)/6.3*60)+35;i++){a.step(1/60,['KeyW']);maxStep=Math.max(maxStep,Math.abs(g.player.position.y-previous.y));previous.copy(g.player.position);}
   a.clear();const local=b.local(g.player.position),forward=local.z>b.depth/2+.4;
   g.cameraState.yaw=b.yaw;for(let i=0;i<Math.ceil((b.depth+6)/6.3*60)+35;i++)a.step(1/60,['KeyW']);a.clear();const ret=b.local(g.player.position).z< -b.depth/2;
   const row={index:b.index,title:b.title,forward,return:ret,maxStep,collisionBoxes:b.collisionBoxes.length,metadata:b.metadata};report.buildings.push(row);
   assert(forward&&ret,'Enter and return '+b.title,row);
   assert(maxStep<.33,'Ground continuity '+b.title,maxStep);
   assert(b.collisionBoxes.length>0,'Physical collisions '+b.title,b.collisionBoxes.length);
   const states=[];for(const value of [0,1,.5,1,0,1]){a.mechanism(b.index,value,true);states.push({target:value,states:b.mechanisms.map(m=>({openness:m.openness,quaternion:m.object.quaternion.toArray()})),passed:b.mechanisms.every(m=>Number.isFinite(m.object.rotation.x)&&Number.isFinite(m.object.rotation.y)&&Math.abs(m.openness-value)<1e-6)});}
   row.mechanisms=states;assert(states.every(s=>s.passed),'Repeat mechanisms '+b.title,states);
   await pause(0);
  }
  // Fixed camera world render captures are for visual QA only; do not alter orbit behavior.
  for(const view of a.views){a.renderView(view);await shot(view.name);}
  const butterfly=g.butterfly;assert(!!butterfly,'External mechanical butterfly retained');
  report.mechanical=a.butterflyAudit();assert(report.mechanical.passed,'Mechanical butterfly states',report.mechanical);
  // Re-enter the separate biological butterfly world twice and return via its actual host.
  report.biological=[];
  for(let cycle=0;cycle<2;cycle++){
   const gate=g.landmarks[23].gatePoint;g.teleport(gate.x,gate.z);g.worldHost.enter('butterfly');
   const until=performance.now()+45000;
   while(g.worldHost.state!=='WORLD'&&performance.now()<until){g.__w2bTest('step',.1);await pause(30);}
   assert(g.worldHost.state==='WORLD','Enter inner scroll '+cycle);
   const loadUntil=performance.now()+60000;while(!w.WorldS.butterfly.biologicalButterfly?.loaded&&performance.now()<loadUntil)await pause(100);
   const bio=w.WorldS.butterfly.biologicalButterfly;report.biological.push(bio);assert(bio?.loaded,'Biological Papilio loaded '+cycle,bio);
   if(cycle===0&&g.reader){w.document.getElementById('world-read').click();await pause(120);assert(g.reader.isOpen&&g.reader.currentIndex===23,'Read original inside biological world');g.reader.close();await pause(120);assert(g.worldHost.state==='WORLD','Return from reading to biological world');}
   g.player.position.set(0,0,-120);g.cameraState.yaw=0;g.cameraState.pitch=-.05;for(let i=0;i<120;i++)g.__w2bTest('step',1/60,{});report.biological[cycle]=w.WorldS.butterfly.biologicalButterfly;if(cycle===0){g.camera.position.set(15,12,-126);g.camera.lookAt(0,8.7,-151);g.camera.fov=40;g.camera.updateProjectionMatrix();await shot('inner-biological-butterfly');}
   g.worldHost.exit();const exitUntil=performance.now()+20000;while(g.worldHost.state!=='HUB'&&performance.now()<exitUntil){g.__w2bTest('step',.1);await pause(20);}
   assert(g.worldHost.state==='HUB','Return to courtyard '+cycle);
  }
  report.movement=a.movementAudit();assert(report.movement.passed,'Run jump slide and camera',report.movement);
  const frameTimes=[];let last=performance.now();for(let j=0;j<20;j++){await new Promise(w.requestAnimationFrame);const now=performance.now();frameTimes.push(now-last);last=now;}report.performance={frames:frameTimes.length,medianFrameMs:frameTimes.slice().sort((a,b)=>a-b)[10],averageFrameMs:frameTimes.reduce((s,n)=>s+n,0)/frameTimes.length,softwareRendered:true};
  report.quality=g.quality;report.renderer={vendor:g.renderer.getContext().getParameter(g.renderer.getContext().VENDOR),renderer:g.renderer.getContext().getParameter(g.renderer.getContext().RENDERER)};report.loads=g.modelLoads;assert(!g.modelLoads.failed.length,'No failed scene assets',g.modelLoads.failed);
  report.browserErrors=w.__courtyardErrors||[];assert(!report.browserErrors.length,'No runtime errors',report.browserErrors);
  report.ui={width:w.innerWidth,height:w.innerHeight,overflow:w.document.documentElement.scrollWidth>w.innerWidth+2};assert(!report.ui.overflow,'No horizontal page overflow',report.ui);
 }catch(error){report.errors.push(error.stack||String(error));}
 await persist(mode+'-report.json',JSON.stringify(report,null,2));const download=document.createElement('a');download.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));download.download=mode+'-online-report.json';download.textContent='Download verified report';document.getElementById('downloads').replaceChildren(download);status.textContent=(report.errors.length?'FAIL':'PASS')+' '+mode+'\n'+JSON.stringify(report,null,2);
};

document.getElementById('movement').onclick=async()=>{const g=frame.contentWindow.__garden;if(!g?.architectureQA)return;g.start();const result=g.architectureQA.movementAudit();await persist(mode+'-movement.json',JSON.stringify(result,null,2));status.textContent=JSON.stringify(result,null,2);};

document.getElementById('camera').onclick=async()=>{
 const w=frame.contentWindow,g=w.__garden;if(!g?.architectureQA)return;g.start();const T=w.THREE,a=g.architectureQA,rows=[];
 for(const b of a.buildings){const p=b.point(0,0);g.teleport(p.x,p.z);for(const pitch of [-.2,.3,.65,1.1])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  g.cameraState.yaw=b.yaw+angle;g.cameraState.pitch=pitch;g.cameraState.distance=16;g.cameraState.initialized=false;a.step(0,[]);
  const start=g.player.position.clone().add(new T.Vector3(0,1.55,0)),direction=g.camera.position.clone().sub(start),length=direction.length();direction.normalize();
  const ray=new T.Raycaster(start,direction,.15,Math.max(.15,length-.12)),hits=ray.intersectObjects(b.cameraMeshes,false);rows.push({index:b.index,pitch,angle,length,passed:hits.length===0});
 }}
 const controls=[];
 for(const b of a.buildings.filter(b=>b.mechanisms.length)){
  const p=b.point(0,0);g.teleport(p.x,p.z);g.__w2bTest('prepare');
  for(const v of [0,1,.5,0,1]){const button=w.document.querySelector('[data-craft="'+v+'"]');button.click();controls.push({index:b.index,value:v,label:button.textContent,target:b.targetOpen,passed:b.targetOpen===v});}
 }
 const result={samples:rows.length,passed:rows.every(r=>r.passed)&&controls.every(r=>r.passed),controls,failed:rows.filter(r=>!r.passed),rows};await persist(mode+'-camera.json',JSON.stringify(result,null,2));status.textContent=JSON.stringify({samples:result.samples,passed:result.passed,failed:result.failed},null,2);
};
