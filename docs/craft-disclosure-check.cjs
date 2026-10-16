/* GPU-free production action-layout lifecycle checks. No browser rendering claims. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(root,'island.html'),'utf8'),'Entry aliases stay identical');
const markup=html.match(/<section id="craft-controls"[\s\S]*?<\/section>/)[0];
assert(markup.includes('<details id="craft-more"><summary id="craft-more-summary"'));
assert(!markup.includes('<details id="craft-more" open'));
assert.equal((markup.match(/data-craft=/g)||[]).length,3,'No action button removed or duplicated');
assert(html.includes("closest('button,a,summary')"),'Native Enter/Space not intercepted');
assert(html.includes("closest('#viewpad,#interaction,#craft-controls,"),'Disclosure excluded from floating joystick capture');
assert(html.includes('#craft-controls summary{min-width:44px;min-height:44px;'));
assert(html.includes('#craft-controls button:focus-visible'));
assert(html.includes('#craft-controls:has(#craft-more[open]){grid-template-columns:repeat(4,minmax(44px,1fr))}'));
assert(html.includes('#craft-more[open]>summary{position:absolute;left:0;top:0;'));
assert(html.includes('#craft-more[open]>#craft-secondary-actions{margin-left:calc((100% - 8px)/3 + 4px)}'));
assert(!/#craft-more\[open\]\{[^}]*padding/.test(html),'Details itself must not use percentage padding');
assert(html.includes('const phase=b?(CRAFT_PRIMARY_PHASES[lm.index]??0):'),'Crafted visits use the same core experience');
assert(html.includes("$('read-entry').hidden=!!next&&nearest?.index===next.index;"),'Avoid duplicate primary entry controls');
class Element {
 constructor(id){this.id=id;this.children=[];this.open=false;this.dataset={};}
 appendChild(child){if(child.parent)child.parent.children=child.parent.children.filter(x=>x!==child);this.children.push(child);child.parent=this;}
 contains(child){return this===child||this.children.some(x=>x.contains(child));}
 querySelectorAll(){return this.children.flatMap(x=>[...(x.dataset.craft!==undefined?[x]:[]),...x.querySelectorAll()]);}
 querySelector(){return this.querySelectorAll()[0];}
 focus(){document.activeElement=this;}
}
const ids=Object.fromEntries(['craft-controls','craft-more','craft-primary','craft-secondary-actions','world'].map(id=>[id,new Element(id)]));
ids['craft-controls'].appendChild(ids['craft-primary']);ids['craft-controls'].appendChild(ids['craft-more']);ids['craft-more'].appendChild(ids['craft-secondary-actions']);
const buttons=[0,.5,1].map(value=>{const b=new Element('phase'+value);b.dataset.craft=String(value);ids['craft-secondary-actions'].appendChild(b);return b;});
const document={activeElement:ids.world},context={document,$:id=>ids[id]};vm.createContext(context);
vm.runInContext(html.slice(html.indexOf('const CRAFT_PRIMARY_PHASES='),html.indexOf('function updateCraftControls(){'))+'\nthis.phases=CRAFT_PRIMARY_PHASES;',context);
assert.equal(context.phases.length,26);
const specs=JSON.parse(fs.readFileSync(path.join(root,'assets/building-actions.js'),'utf8').match(/const SPECS = (\[.*?\]);/)[1]);
const rows=[];let previous=null;
for(let index=0;index<26;index++){
 const next={index};ids['craft-more'].open=true;buttons[0].focus();context.arrangeCraftActions(next,previous);
 const primary=ids['craft-primary'].children,secondary=ids['craft-secondary-actions'].children;
 assert.equal(primary.length,1);assert.equal(secondary.length,2);assert.equal(Number(primary[0].dataset.craft)*2,context.phases[index]);
 assert.equal(ids['craft-more'].open,false);assert.equal(document.activeElement,primary[0]);
 assert.equal(new Set([...primary,...secondary]).size,3);
 ids['craft-more'].open=true;secondary[0].focus();context.arrangeCraftActions(next,next);
 assert.equal(ids['craft-more'].open,true,'An animation frame must not collapse the disclosure');assert.equal(document.activeElement,secondary[0],'Frame updates preserve focused action');
 rows.push({index,primaryPhase:context.phases[index],primary:specs[index].labels[context.phases[index]],secondary:secondary.map(b=>specs[index].labels[Number(b.dataset.craft)*2])});previous=next;
}
context.arrangeCraftActions(null,previous);assert.equal(document.activeElement,ids.world,'Leaving avoids focus in hidden controls');assert.equal(ids['craft-more'].open,false);
// Execute the actual entry function: ordinary buildings keep a stable primary,
// while the butterfly without a craft card retains every phase via repeated entry.
const visits=[],phases=new Map(),records=Array.from({length:26},(_,index)=>({index})).filter(b=>b.index!==23);
Object.assign(context,{started:true,modalOpen:()=>false,worldActive:()=>false,markVisited:()=>{},architecturalRecords:records,buildingActions:{inspect:index=>phases.has(index)?{phase:phases.get(index)}:null},applyBuildingAction:(b,phase)=>{const index=typeof b==='number'?b:b.index;phases.set(index,phase);visits.push({index,phase});}});
vm.runInContext(html.slice(html.indexOf('function visit(lm,sectionId){'),html.indexOf("$('read-entry').onclick=")),context);
for(let index=0;index<26;index++){const start=visits.length;for(let n=0;n<4;n++)context.visit({index});const actual=visits.slice(start).map(v=>v.phase);assert.deepEqual(actual,index===23?[0,1,2,0]:Array(4).fill(context.phases[index]),'Entry reachability for '+index);}
// Primary mappings must keep activation, not stop/reset, prominent in timed demos.
assert.equal(context.phases[24],0);assert.equal(context.phases[23],0);assert.equal(context.phases[12],1);
for(const script of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
const report={passed:true,buildings:26,preservedActions:78,rows,evidenceBoundary:'Production function with a minimal DOM model plus source checks. Native disclosure rendering, keyboard activation, touch target hits and expanded mobile layout require real browser/device verification.'};
fs.writeFileSync(path.join(root,'qa-results/craft-disclosure-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
