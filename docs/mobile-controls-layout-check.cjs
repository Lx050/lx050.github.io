/* Source/formula regression only. Real DOM must be checked with the HTML fixture. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const required=[
 '#joystick{display:block;position:absolute;left:max(34px,calc(12px + env(safe-area-inset-left)));bottom:var(--joy-bottom);width:var(--joy-size);height:var(--joy-size);',
 '--sprint-right:max(28px,env(safe-area-inset-right))',
 '#jump{display:none;position:absolute;right:calc(var(--sprint-right) + 88px);bottom:max(46px,env(safe-area-inset-bottom));width:64px;height:64px;',
 '.touch{--joy-size:132px;--joy-bottom:max(46px,calc(12px + env(safe-area-inset-bottom)))}',
 '@media(max-width:384px){#jump{bottom:calc(var(--joy-bottom) + var(--joy-size) + 24px)}}'
];required.forEach(s=>assert(html.includes(s),'Exact production formula must match test: '+s));
assert(/#sprint\{[^}]*bottom:max\(46px,env\(safe-area-inset-bottom\)\);width:78px;height:78px/.test(html));
function box(left,bottom,width,height,h=640){return{left,right:left+width,top:h-bottom-height,bottom:h-bottom,width,height};}
function overlap(a,b){const width=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)),height=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));return {width,height,area:width*height};}
assert(html.includes('body:not(.world-active) #jump{right:var(--sprint-right);bottom:calc(max(46px,env(safe-area-inset-bottom)) + 90px)}'));
const rows=[];
for(const world of [false,true])for(const width of Array.from({length:71},(_,n)=>320+n))for(const [mode,left,right,bottom]of [['zero',0,0,0],['bottom34',0,0,34],['side44-bottom34',44,44,34],['side44-bottom80',44,44,80]]){
 const joyBottom=Math.max(46,12+bottom),sprintRight=Math.max(28,right),sprintBottom=Math.max(46,bottom),jumpBottom=width<=384?(world?joyBottom+132+24:sprintBottom+90):sprintBottom;
 const controls={joystick:box(Math.max(34,12+left),joyBottom,132,132),jump:box(width-sprintRight-(width<=384&&!world?0:88)-64,jumpBottom,64,64),sprint:box(width-sprintRight-78,sprintBottom,78,78)};
 const pairs=[['joystick','jump'],['joystick','sprint'],['jump','sprint']].map(([a,b])=>({pair:a+'/'+b,...overlap(controls[a],controls[b])}));
 pairs.forEach(p=>assert.equal(p.area,0,width+' '+mode+' '+p.pair));
 for(const [name,b]of Object.entries(controls)){assert(b.width>=44&&b.height>=44,'Retain target size '+name);assert(b.left>=left&&b.right<=width-right&&b.top>=0&&b.bottom<=640-bottom,'Remain inside synthetic safe area '+name);}
 // A conservative 54 px-high single-line return button has a separate vertical band.
 const returnTop=640-(Math.max(46,bottom)+78+18)-54,returnBottom=640-(Math.max(46,bottom)+78+18);
 if(world)assert(controls.jump.bottom<=returnTop||controls.jump.top>=returnBottom,'Avoid the existing world-return vertical band');
 rows.push({width,mode,world,formulaOnly:true,controls,pairs,worldReturnConservativeBand:{top:returnTop,bottom:returnBottom}});
}
// Reproduce the independently confirmed baseline geometry, and preserve 390px layout.
assert.deepEqual(overlap(box(34,46,132,132),box(140,46,64,64)),{width:26,height:64,area:1664});
assert.equal(rows.find(r=>r.width===390&&r.mode==='zero').controls.jump.top,640-46-64);
for(const f of ['island.html'])assert.equal(fs.readFileSync(path.join(root,f),'utf8'),html);
const report={passed:true,sourceFormulaCases:rows.length,minimumTargetPixels:64,baseline320Intersection:{width:26,height:64},rows:rows.filter(r=>[320,360,390].includes(r.width)),sweptWidths:[320,390],evidenceBoundary:'Passed source/formula regression. New fixture has not yet been retested in actual DOM; real touch gesture verification remains separate.'};
fs.writeFileSync(path.join(root,'qa-results/mobile-controls-layout-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,sourceFormulaCases:rows.length,overlaps:0,targetsAtLeast44:true,actualDOM:'Awaiting Mac retest'},null,2));

// garden.html is the separately authored 2D garden, never a 3D alias.
assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'garden.html'))).digest('hex'),'938aa89e3c9cff3f83d3e13eb029f319de862e76bcb32194e716496f0f524cd4','Preserve independent baseline garden');
