/* Real production walker, collision/support queries, action controller and host
 * objective integration. Renderer/DOM are inert: no GPU or visual evidence. */
'use strict';
const assert=require('node:assert/strict');
const {loadHost}=require('./exploration-host.cjs');
const EXEMPLARS=[0,1,3,6,10,22,23,24];
function walkLevel(g,w,index,options={}){
 const p=w.places[index],dt=1/60,maxFrames=options.maxFrames||18000;
 if(!options.resume){assert(w.travel(index),'verified entry transfer '+index);assert(w.enterLevel(index),'enter '+index);}
 const initial=w.levels.progress(index),targets=[],actions=[],pathKeys=new Set();let frames=0,walkFrames=0,sampleFrames=0,lastKey=null;
 const center=p.point(0,0);
 while(!w.levels.progress(index).runCompleted&&frames++<maxFrames){
  const state=w.levels.progress(index);if(options.stopOnObservation&&(state.objective.waiting||state.objective.viewIndex>=0))break;assert(state.expected,'expected target '+index);
  const local=state.expected.position,target=p.point(local.x,local.z),key=state.stage+':'+state.expected.station+':'+state.objective.viewIndex;
  const ground=w.surface(target.x,target.z,p.y+1);assert(ground,'dry target '+index+'/'+key);target.y=ground.height;
  assert(!w.blocked(target.x,target.y,target.z,.4,1.7),'clear target '+index+'/'+key);
  if(lastKey!==key){targets.push({stage:state.stage,station:state.expected.station,viewIndex:state.objective.viewIndex});lastKey=key;}
  if(options.auditPath!==false&&!pathKeys.has(key)){
   const from=g.player.position.clone(),distance=from.distanceTo(target),steps=Math.max(1,Math.ceil(distance/.25));
   for(let i=0;i<=steps;i++){const q=from.clone().lerp(target,i/steps),floor=w.surface(q.x,q.z,p.y+1);assert(floor,'continuous path support '+index+'/'+key);assert(!w.blocked(q.x,floor.height,q.z,.4,1.7),'continuous path capsule '+index+'/'+key);}
   pathKeys.add(key);
  }
  const distance=Math.hypot(g.player.position.x-target.x,g.player.position.z-target.z);
  if(distance>1.25){g.cameraState.yaw=Math.atan2(g.player.position.x-target.x,g.player.position.z-target.z);w.stepInput(dt,['KeyW']);walkFrames++;}
  else {g.cameraState.yaw=Math.atan2(g.player.position.x-center.x,g.player.position.z-center.z);w.stepInput(dt,[]);if(state.objective.waiting)sampleFrames++;}
  const floor=w.surface(g.player.position.x,g.player.position.z,p.y+1);assert(floor,'walker stays supported '+index);assert(Math.abs(g.player.position.y-floor.height)<.02,'walker ground contact '+index);
  const ready=w.levels.progress(index);
  if(ready.canInteract){
   const phase=ready.phase,before=g.buildingActions.inspect(index),beforeCount=before?.counts[phase]||0;
   assert(w.action(phase),'real action accepted '+index+'/'+phase);
   const after=g.buildingActions.inspect(index);assert.equal(after.phase,phase);assert.equal(after.counts[phase],beforeCount+1,'one authored action per accepted press');
   actions.push({phase,count:after.counts[phase],playing:after.playing,paused:after.paused,template:after.template,mechanismValue:after.mechanismValue});
  }
 }
 assert(frames<maxFrames,'bounded production route '+index+' '+JSON.stringify(w.levels.progress(index)));
 const final=w.levels.progress(index);if(!options.stopOnObservation)assert(final.runCompleted&&final.completed&&final.readingUnlocked,'real route complete '+index);if(!options.resume)assert(walkFrames>0,'walked, not station teleported');
 const result={index,title:p.title,family:initial.objective.family,completed:final.runCompleted,frames,walkFrames,sampleFrames,targets,actions};
 if(!options.stopOnObservation&&!options.resume){
 if(index===0||index===1||index===6||index===10)assert.equal(actions.length,4,'paired actual effect');
 if(index===3){assert.equal(actions.length,5);const toggles=actions.filter(a=>a.phase===1);assert.equal(toggles.length,3);assert.deepEqual(toggles.map(a=>[a.playing,a.paused]),[[true,false],[false,true],[true,false]]);assert(sampleFrames>=59);}
 if(index===6){const templates=actions.filter(a=>a.phase===1).map(a=>a.template);assert.notEqual(templates[0],templates[1],'real layout variant changes');}
 if(index===22){assert.equal(actions.length,3);assert.deepEqual(targets.filter(t=>t.stage===1&&t.viewIndex>=0).map(t=>t.station),['left','right']);}
 if(index===24){assert.equal(actions.length,3);assert(sampleFrames>=59,'one real foreground second sampled');assert(sampleFrames<120,'never wait for three-minute timer');}
 }
 if(!options.stopOnObservation)w.leaveLevel();return result;
}
async function run(){
 const results=[],interruptions=[];
 for(const reducedMotion of[false,true]){
  const {garden:g,context:c}=await loadHost({reducedMotion}),w=g.exploration;assert(w);g.start();
  // This asserts the media state in the host, not an ignored tracker flag.
  assert.equal(c.matchMedia('(prefers-reduced-motion:reduce)').matches,reducedMotion,'host reduced-motion mode');
  for(const index of EXEMPLARS)results.push({...walkLevel(g,w,index),reducedMotion});
  for(const index of[3,22,24]){
   const prepared=walkLevel(g,w,index,{stopOnObservation:true});assert.equal(prepared.completed,false);
   const phase=w.levels.progress(index).stage;w.leaveLevel();
   assert(w.action(2),'free End/Replay/Unresolved action after exit '+index);assert.equal(g.buildingActions.inspect(index).phase,2);
   assert(w.enterLevel(index));assert.equal(w.levels.progress(index).stage,phase);assert.equal(w.levels.progress(index).objective.waiting,false);assert.equal(w.levels.progress(index).objective.viewIndex,-1);
   const resumed=walkLevel(g,w,index,{resume:true});assert(resumed.completed);interruptions.push({index,reducedMotion,phasePreserved:phase,completed:true,actions:resumed.actions.length});
  }
 }
 const report={passed:true,evidence:'real production walker and authored actions; inert renderer/DOM',exemplars:8,routes:results.length,interruptedRoutes:interruptions.length,results,interruptions,
  limits:['Not a real browser, WebGL, GPU frame-rate or physical-device test.']};
 console.log(JSON.stringify(report,null,2));return report;
}
module.exports={walkLevel,EXEMPLARS,run};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
