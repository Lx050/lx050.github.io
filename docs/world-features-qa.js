/* Visible local-only QA controls. Never calls external services or changes user data. */
'use strict';
const f=document.getElementById('frame'),out=document.getElementById('status'),shots=document.getElementById('shots');
const report={status:'pending',checks:[],screenshots:[],limits:['No hardware GPU, phone, or Safari performance claim']};
function show(){out.textContent=JSON.stringify(report,null,2)}
function api(){return f.contentWindow.__garden}
f.onload=()=>{report.status=api()?.architectureQA?'ready':'blocked: this browser could not initialize WebGL; no 3D pixels verified';show()};
document.getElementById('narrow').onclick=()=>{f.style.width=f.style.width==='390px'?'min(1280px,100%)':'390px'};
document.getElementById('weather').onchange=e=>{api()?.weather?.setMode(e.target.value)};
function capture(g,name){const image=new Image();image.alt=name;image.src=g.renderer.domElement.toDataURL('image/png');const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=name;figure.append(image,caption);shots.append(figure);report.screenshots.push(name);return image.src}
document.getElementById('run').onclick=()=>{
 const g=api();if(!g?.architectureQA){report.status='blocked: WebGL unavailable, visual verification not run';show();return}
 shots.replaceChildren();report.checks=[];report.screenshots=[];report.status='running';
 const assert=(passed,name,detail)=>report.checks.push({passed:!!passed,name,detail});
 try{
  g.start();g.architectureQA.pauseRendering(true);g.setSky(.28);const records=g.architectureQA.buildings;
  for(let index=0;index<26;index++)for(let phase=0;phase<3;phase++){
   const before=f.contentWindow.location.href;g.buildingActions.apply(index,phase);g.buildingActions.update(.1);
   assert(g.buildingActions.inspect(index)?.phase===phase,'action '+index+':'+phase);
   assert(before===f.contentWindow.location.href&&!g.reader.isOpen,'action stays in world '+index+':'+phase);
  }
  // Check visible texture content, not only the reported action/chapter IDs.
  for(const index of [13,14,15]){
   const b=records.find(b=>b.index===index),p=b.readingPanels.panels[0];
   b.readingPanels.setSection(b.readingPanels.content.sections.find(s=>s.id!=='source-note').id);
   f.contentWindow.CourtyardReadingPanels.update([b],p.face.getWorldPosition(new f.contentWindow.THREE.Vector3()));
   const before=p.texture?.image?.toDataURL();b.readingPanels.setSection('source-note');
   assert(p.section?.id==='source-note'&&before!==p.texture?.image?.toDataURL(),'actual source-note texture changes '+index);
  }
  const moonController=records.find(b=>b.index===20).readingPanels;
  if(moonController){for(const id of ['preface','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10']){
   // A repeated selection is intentionally idempotent. Establish a different
   // section on the SAME physical surface before requiring visible pixel change.
   const groups=[['preface','c1','c2','c3','c4'],['c5','c6'],['c7','c8','c9'],['c10','source-note']];
   const group=groups.find(items=>items.includes(id)),other=group.find(item=>item!==id);moonController.setSection(other);
   const before=moonController.faces.map(face=>face.material.map.image.toDataURL()).join('|');moonController.setSection(id);
   const after=moonController.faces.map(face=>face.material.map.image.toDataURL()).join('|');
   assert(moonController.selectedSectionId===id&&before!==after,'actual Moon Snow inscription changes '+id);
   moonController.setSection(id);assert(after===moonController.faces.map(face=>face.material.map.image.toDataURL()).join('|'),'same Moon Snow section remains stable '+id);
  }}else assert(false,'Moon Snow inscription controller exists');
  for(const index of [6,13,20]){
   const b=records.find(b=>b.index===index),panel=b.readingPanels?.activePanel||b.readingPanels?.panels[0];
   let view;
   if(panel){const T=f.contentWindow.THREE,p=panel.placement,d=panel.face.getWorldPosition(new T.Vector3());const eye=b.readingPanels.integrated?d.clone().add(new T.Vector3(0,0,1).applyQuaternion(panel.face.getWorldQuaternion(new T.Quaternion())).multiplyScalar(1.8)):b.root.localToWorld(new T.Vector3(p.view[0],1.6,p.view[1]));view={position:eye.toArray(),target:d.toArray(),sky:.28};}
   else view=g.architectureQA.views.find(v=>v.name==='moon-snow-turn-and-pause')||g.architectureQA.views.find(v=>v.name==='interior-'+index);
   if(view){g.weather.setMode('clear');g.architectureQA.renderView(view);capture(g,'inscription-building-'+index);}
  }
  const moon=records.find(b=>b.index===20),target=moon.point(0,-3),eye=moon.point(1,-8);target.y=moon.origin.y+1.5;eye.y=moon.origin.y+2;
  const view={position:eye.toArray(),target:target.toArray(),sky:.28};g.architectureQA.renderView(view);g.weather.setMode('snow');
  for(let n=0;n<180;n++)g.weather.update(1/60,{reduced:false,lightQuality:false});g.architectureQA.renderFrame(0);const first=capture(g,'moon-snow-falling-first');
  for(let n=0;n<30;n++)g.weather.update(1/60,{reduced:false,lightQuality:false});g.architectureQA.renderFrame(0);const second=capture(g,'moon-snow-falling-next');
  assert(g.weather.inspect().visibleParticles>0,'snow geometry visible count',g.weather.inspect());assert(first!==second,'successive rendered snow frames differ');
  const doc=f.contentDocument,select=doc.getElementById('weather-select');select.value='rain';select.dispatchEvent(new Event('change',{bubbles:true}));assert(g.weather.mode==='rain','real weather select changes mode');
  assert(!g.reader.isOpen,'all primary actions left reader closed');
  report.status=report.checks.every(x=>x.passed)?'automated checks passed; inspect captured text legibility, physical placement and snow occlusion manually':'failed';
 }catch(e){report.status='failed';report.error=String(e.stack||e)}finally{g.architectureQA.pauseRendering(false)}show();
};

document.getElementById('layout').onclick=async()=>{
 const d=f.contentDocument;report.layout=[];
 d.getElementById('intro').hidden=true;d.getElementById('intro').style.display='none';d.getElementById('error').style.display='none';d.getElementById('hud').inert=false;d.body.classList.add('playing');
 for(const width of [320,390,760,1280]){f.style.width=width+'px';await new Promise(r=>setTimeout(r,80));const a=d.querySelector('.topbar').getBoundingClientRect(),b=d.querySelector('.tools').getBoundingClientRect(),c=d.getElementById('weather-select').getBoundingClientRect();const targets=[...d.querySelectorAll('.topbar button')].filter(el=>el.getClientRects().length).map(el=>({id:el.id||el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));report.layout.push({width,toolbarRight:a.right,toolsRight:b.right,selectWidth:c.width,targets,passed:b.right<=width&&c.width>=44&&(width>760||targets.every(t=>t.width>=44&&t.height>=44))})}
 f.style.width='390px';report.layoutNote='HUD-only layout test; 3D rendering still unverified';show();
};
