const frame=document.getElementById('frame'),status=document.getElementById('status');let mode='desktop';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const save=async(name,data)=>{if(['localhost','127.0.0.1'].includes(location.hostname))await fetch('/__qa_artifact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,text:JSON.stringify(data,null,2)})});};
frame.onload=()=>status.textContent=frame.contentWindow.__courtyardReader?'Ready':'Reader unavailable';
document.getElementById('open').onclick=()=>frame.contentWindow.__courtyardReader?.open(20,'c4');
for(const m of ['desktop','narrow'])document.getElementById(m).onclick=()=>{mode=m;frame.style.width=m==='narrow'?'390px':'1280px';frame.style.height=m==='narrow'?'844px':'900px';frame.src='../index.html?architectureQA=1&readingView='+m;status.textContent='Loading '+m;};
document.getElementById('run').onclick=async()=>{
 const w=frame.contentWindow,d=w.document,r=w.__courtyardReader,g=w.__garden,report={mode,at:new Date().toISOString(),rows:[],checks:[],errors:[]};
 const check=(passed,label,detail)=>{report.checks.push({passed:!!passed,label,detail});if(!passed)report.errors.push(label);};
 try{
  if(!r)throw Error('Reader not installed');g?.start();
  const manifest=await fetch('../assets/readings/index.json').then(r=>r.json());check(manifest.entries.length===26,'All 26 destinations in reading manifest');
  for(const item of manifest.entries){
   status.textContent='Reading '+item.index+' / '+item.title;
   const data=await fetch('../assets/readings/'+item.path).then(r=>r.json());await r.open(item.index,data.sections[0]?.id);
   const dialog=d.querySelector('.cr-dialog'),first=data.sections[0],body=d.querySelector('.cr-article');
   check(r.isOpen&&dialog.open,'Open '+item.index);check(body.textContent.includes(first?.title||''),'First section '+item.index);
   check(d.querySelectorAll('.cr-chapter').length===data.sections.length,'Full chapter list '+item.index);
   if(['anonymized','privacy-edited'].includes(data.coverage)){check(d.querySelector('.cr-coverage-badge').textContent.includes(data.coverage==='anonymized'?'匿名化':'局部隐私'),'Privacy scope clearly labeled '+item.index);check(!d.querySelector('.cr-dialog a[href^="https://"]'),'No identifying original-source links '+item.index);}
   check(dialog.getBoundingClientRect().width<=w.innerWidth+1,'Reader fits viewport '+item.index);
   check(d.documentElement.scrollWidth<=w.innerWidth+2,'No page overflow '+item.index);
   const pos=g?.player.position.clone();if(g)for(let k=0;k<45;k++)g.architectureQA.step(1/60,['KeyW']);
   check(!g||g.player.position.distanceTo(pos)<1e-9,'Movement paused '+item.index);
   const last=data.sections[data.sections.length-1];await r.open(item.index,last?.id);check(d.querySelector('.cr-section-title')?.textContent===last?.title,'Last section reachable '+item.index);
   report.rows.push({index:item.index,coverage:data.coverage,sections:data.sections.length,wordCount:data.wordCount});r.close();await delay(90);check(!r.isOpen,'Return from '+item.index);
  }
  await r.open(17,'o5');const table=d.querySelector('.cr-table');check(!!table&&table.querySelectorAll('tbody tr').length===8,'Double Stars chronology table');check(table?.parentElement.previousElementSibling?.dataset.paragraph==='0','Chronology keeps source position');r.close();await delay(90);
  await r.open(13,'s1');const input=d.querySelector('.cr-search-input');input.value='AI';input.dispatchEvent(new w.Event('input',{bubbles:true}));check(d.querySelectorAll('.cr-result').length>0,'Search across full text');
  const paragraph=d.querySelector('.cr-paragraph');const range=d.createRange();range.selectNodeContents(paragraph);w.getSelection().removeAllRanges();w.getSelection().addRange(range);check(w.getSelection().toString().length>0,'Text is selectable');w.getSelection().removeAllRanges();
  d.querySelector('.cr-close').click();await delay(120);check(!r.isOpen,'Close button returns');
  await r.open(20);d.querySelector('.cr-search-input').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));await delay(120);check(!r.isOpen,'Escape returns');
  if(g){
   const b=g.architectureQA.buildings.find(b=>b.index===13),near=b.point(0,-b.depth/2+3);g.teleport(near.x,near.z);g.__w2bTest('prepare');
   d.getElementById('world').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}));await delay(140);check(r.isOpen&&r.currentIndex===13,'Enter opens nearby reading inside courtyard');r.close();await delay(90);
   g.__w2bTest('prepare');d.getElementById('read-entry').click();await delay(140);check(r.isOpen&&r.currentIndex===13,'Primary nearby reading button');r.close();await delay(90);
  }
  report.browserErrors=w.__courtyardErrors||[];check(!report.browserErrors.length,'No runtime errors',report.browserErrors);
 }catch(e){report.errors.push(e.stack||String(e));}
 r?.close();report.passed=report.errors.length===0;await save(mode+'-reading-report.json',report);status.textContent=(report.passed?'PASS ':'FAIL ')+JSON.stringify(report,null,2);
};

document.getElementById('panel').onclick=async()=>{
 const w=frame.contentWindow,g=w.__garden,T=w.THREE,a=g?.architectureQA;if(!a)return;g.start();g.reader.close();await delay(100);
 const b=a.buildings.find(b=>b.index===0),panel=b.readingPanels.panels[0],target=panel.face.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).applyQuaternion(panel.face.getWorldQuaternion(new T.Quaternion()));
 const position=target.clone().addScaledVector(normal,3.05);position.y=b.origin.y+1.85;target.y=b.origin.y+1.30;const visible=g.player.visible;g.player.visible=false;
 a.renderView({position:position.toArray(),target:target.toArray()});const base64=g.renderer.domElement.toDataURL('image/png').split(',')[1];g.player.visible=visible;
 await fetch('/__qa_artifact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'reading-entrance-panel.png',base64})});status.textContent='Saved entrance-panel preview';
};
