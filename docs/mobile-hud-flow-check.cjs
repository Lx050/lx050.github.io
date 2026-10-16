/* Source/flow guarantees, not a substitute for the actual full-HUD fixture. */
'use strict';const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('vm'),root=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(root,'index.html'),'utf8'),fixture=fs.readFileSync(path.join(root,'docs/mobile-controls-layout-fixture.html'),'utf8');
const group=h.match(/  <div id="nearby-controls">\n([\s\S]*?)\n  <\/div>/)[1];
assert(group.includes('id="craft-controls"'));assert(group.includes('id="interaction"'));assert(group.includes('id="read-entry"'));
assert.equal((h.match(/id="craft-controls"/g)||[]).length,1);assert.equal((h.match(/id="interaction"/g)||[]).length,1);
const rules=['#nearby-controls{display:contents}',
 '#nearby-controls{position:absolute;display:flex;flex-direction:column-reverse;gap:8px;',
 'bottom:calc(var(--joy-bottom) + var(--joy-size) + 28px)',
 '#nearby-controls #interaction{position:static;width:100%;transform:none;margin:0}',
 '#nearby-controls #interaction:not(.visible){display:none}',
 '#nearby-controls #craft-controls{position:static;max-width:none;width:100%;padding:6px 8px;display:grid;grid-template-columns:repeat(3,minmax(44px,1fr));gap:4px}',
 '#nearby-controls #craft-status{grid-column:1/-1;font-size:10px;line-height:1.3;margin:0}',
 '#nearby-controls #craft-controls button{width:100%;min-height:44px;min-width:44px;margin:0}',
 'body:not(.world-active) #jump{right:var(--sprint-right);bottom:calc(max(46px,env(safe-area-inset-bottom)) + 90px)}'];
rules.forEach(s=>assert(h.includes(s),'Production flow contract: '+s));
const flow=h.match(/<style id="mobile-nearby-layout">([\s\S]*?)<\/style>/)[1];
assert(!/line-clamp|text-overflow|overflow:|visibility:hidden/.test(flow),'No clamping or clipping actions/content');
// Removing independent positioning and fixed heights lets actual font metrics drive both cards.
assert(!/[;{]height:/.test(flow),'No fixed card heights');
const rows=[];
for(const width of [320,360,375,384,390])for(const side of [0,44])for(const bottom of [0,34]){
 const inset=Math.max(14,12+side),available=width-2*inset,craftInner=available-18,buttonWidth=(craftInner-8)/3;
 assert(buttonWidth>=44,'Three unshrunk >=44px craft buttons');
 const joyBottom=Math.max(46,12+bottom),dockBottom=640-(joyBottom+132+28),jumpTop=640-(width<=384?Math.max(46,bottom)+90:Math.max(46,bottom))-64;
 assert(dockBottom+6<=jumpTop,'Dock clears jump by at least 6 CSS px');
 assert(dockBottom+28<=640-joyBottom-132,'Dock clears joystick footprint by 28 CSS px');
 // 2 lines of 10px/1.3 status + a >=44px button row and explicit padding/gaps.
 // This is a bounded content-height calculation, not a browser font result.
 const craftHeight=14+26+4+44,interactionHeight=64,dockHeight=craftHeight+8+interactionHeight;
 const dockTop=dockBottom-dockHeight,mapBottom=140+108+7+14.4;
 assert(dockTop>mapBottom,'Two-line content estimate clears existing map band');
 rows.push({width,side,bottom,available,buttonWidth,estimatedDock:{top:dockTop,bottom:dockBottom,height:dockHeight},jumpTop,fontLayoutStillNeedsBrowser:true});
}
assert(fixture.includes('data-craft'));assert(fixture.includes('elementFromPoint'));assert(fixture.includes('circle')||fixture.includes('round'));
assert(fixture.includes('文字成为有序版面'));assert(fixture.includes('推开漏窗，沿曲廊走向共同书案'));assert(fixture.includes('allHUDTargetsHit'));
for(const m of fixture.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const report={passed:true,sourceFlowCases:rows.length,checks:['Single shared measured mobile flow','All existing actions retained, no clipping or fixed card height','Three equal craft targets >=44px','Dock/thumb separation','Narrow hub jump slot leaves inner-world jump unchanged','Full production HUD/source labels in fixture','Center/cardinal/diagonal hit-test assertions included'],rows,evidenceBoundary:'Source and bounded two-line calculations only. Actual corrected DOM, text flow, all-HUD hit tests and device gestures must be retested on Mac.'};
fs.writeFileSync(path.join(root,'qa-results/mobile-hud-flow-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,sourceFlowCases:rows.length,actualDOM:'Awaiting Mac full-HUD retest'},null,2));
