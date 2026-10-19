/* GPU-free real-mesh regression. No claim about rendered contrast, FPS or touch UX. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const context={THREE,console,document:{createElement(){
  const canvas={width:0,height:0,text:[]};
  const c=new Proxy({font:'20px serif',fillText(text){canvas.text.push(text);},clearRect(){canvas.text.length=0;},
    measureText(text){return {width:Array.from(text).length*(parseFloat(this.font.match(/\d+px/)?.[0])||20)};},
    createLinearGradient(){return {addColorStop(){}};}
  },{get:(o,k)=>k in o?o[k]:(()=>{})});canvas.getContext=()=>c;return canvas;
}}};context.window=context;vm.createContext(context);
for(const file of ['architecture','content-core','ink-detail','restoration-detail','huayun-detail','content-creation-care','shield-detail','gateway-detail','reme-detail','content-services','twinstars-detail','causal-detail','versions-detail','city-detail','portraits-detail','content-narratives','rubbing-detail','proof-detail','workshop-detail','content-literary','moon-snow-garden','reading-catalog','reading-panels','courtyard-runtime'])
  new vm.Script(fs.readFileSync(path.join(root,'assets',file+'.js'),'utf8'),{filename:file}).runInContext(context);
const api=context.CourtyardReadingPanels,rows=[];
for(const index of [14,21]){
  const b=context.CourtyardArchitecture.build({THREE,index,title:'Window test',zone:0});
  const original=b.collisionBoxes.slice();b.root.position.set(index*17,2,31);b.root.rotation.y=.73;
  const c=api.attach({THREE,building:b,index,preview:context.CourtyardReadingCatalog[index]});
  for(const p of c.panels){
    assert(p.framed,'Representative room receives its supported window');
    const frame=p.group.children.filter(m=>m.name.startsWith('inscription-window-'));
    assert.equal(frame.length,3);assert(p.distantTexture);assert.equal(p.distantTexture.image.width,128);
    assert.equal(p.face.material.map,p.distantTexture,'Distant glyphs stay on the stone without a high-resolution allocation');
    p.group.updateWorldMatrix(true,true);
    function blocks(eye,target){
      const a=p.group.localToWorld(new THREE.Vector3(...eye)),z=p.group.localToWorld(new THREE.Vector3(...target));
      const ray=new THREE.Raycaster(a,z.clone().sub(a).normalize(),0,a.distanceTo(z)-.001);
      return ray.intersectObjects(frame).length>0;
    }
    // All text corners and the center remain readable over a broad normal stance,
    // with both short and tall eye positions: no precise alignment requirement.
    for(const x of [-.25,0,.25])for(const eyeY of [-.05,.18,.42])for(const tx of [-.53,0,.53])for(const ty of [-.67,0,.67])
      assert(!blocks([x,eyeY,1.45],[tx,ty,.035]),'Whole face visible from ordinary near reading positions');
    const sideSamples=[1.4,2,3].map(x=>blocks([x,.18,1.45],[0,0,.035]));
    assert(sideSamples.some(Boolean),'Passing oblique views are cropped by physical masonry');
    assert(!blocks([0,.18,1.45],[0,0,.035]),'Returning to the ordinary approach reveals the same inscription');
    const matrix=p.group.matrixWorld.toArray();
    const near=b.root.localToWorld(new THREE.Vector3(p.placement.view[0],1.7,p.placement.view[1]));
    api.update([b],near);assert(p.texture);assert.equal(p.face.material.map,p.texture);
    const old=p.distantTexture;let disposed=false;old.addEventListener('dispose',()=>{disposed=true;});
    c.setSection(context.CourtyardReadingCatalog[index].sections[p.ordinal ? 1 : context.CourtyardReadingCatalog[index].sections.length-1].id);
    assert(disposed,'Changing source sections releases the previous far texture');
    api.update([b],new THREE.Vector3(99999,0,99999));assert(!p.texture);assert.equal(p.face.material.map,p.distantTexture);
    assert.deepEqual(p.group.matrixWorld.toArray(),matrix,'Walking and reading never billboard/move the text or window');
    rows.push({index,ordinal:p.ordinal,nearSamples:81,physicalOcclusion:true,distantTexture:[128,160]});
  }
  // Every selected catalog extract fits whole on one face. No split-glyph puzzle,
  // invented prose or dropping the end of the already-abridged source excerpt.
  for(const section of context.CourtyardReadingCatalog[index].sections){
    c.setSection(section.id);const p=c.panels[0];
    api.update([b],b.root.localToWorld(new THREE.Vector3(p.placement.view[0],1.7,p.placement.view[1])));
    const calls=p.texture.image.text;
    // Every inscription line is drawn twice for its shallow engraved highlight.
    const drawn=calls.filter((_,n)=>n%2===0).join('');
    assert(drawn.includes(section.excerpt.replace(/\s+/g,' ').trim()),'Whole reviewed extract: '+index+'/'+section.id);
  }
  const farTextures=c.panels.map(p=>p.distantTexture);let disposed=0;farTextures.forEach(t=>t.addEventListener('dispose',()=>disposed++));
  c.dispose();assert.equal(disposed,farTextures.length);assert.deepEqual(b.collisionBoxes,original,'Disposal removes every added collider');
}
const moon=context.CourtyardArchitecture.build({THREE,index:20,title:'Moon',zone:0});
const moonFaces=[];moon.root.traverse(m=>{if(m.userData.readingPanel)moonFaces.push(m);});
const maps=moonFaces.map(m=>m.material.map);
const mc=api.attach({THREE,building:moon,index:20,preview:context.CourtyardReadingCatalog[20]});
assert(mc.integrated);assert.equal(mc.content.coverage,'anonymized');assert.deepEqual(moonFaces.map(m=>m.material.map),maps);
assert(!moon.root.getObjectByName('inscription-window-left-jamb'),'Moon Snow keeps its original authored windows');
const report={passed:true,validation:'GPU-free geometry and source regression; browser/WebGL not run',framedSurfaces:rows.length,rows,moonSnowUnchanged:true};
fs.writeFileSync(path.join(root,'qa-results/framed-reading-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
