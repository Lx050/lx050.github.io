/* Bounded CSS/source checks, NOT a layout engine, browser DOM or touch test.
 * node docs/masterplan-layout-source-check.cjs
 * The separate masterplan-layout-check.cjs is the real-browser fixture. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/index.html','utf8');
const sourceChecks=[
 ['whole dock scrolls with conventional forward flow','#nearby-controls{display:block;max-height:calc(100dvh - var(--joy-bottom) - var(--joy-size) - 320px);overflow-y:auto;overscroll-behavior:contain;pointer-events:auto}'],
 ['empty dock cannot intercept movement','#nearby-controls:not(:has(#craft-controls:not([hidden]),#interaction.visible)),.world-active #nearby-controls{display:none!important}'],
 ['reader focus and pointer priority','.reading-open #nearby-controls{visibility:hidden;pointer-events:none}'],
 ['portrait compact map remains a button','@media(max-width:480px) and (max-height:600px) and (orientation:portrait){.mapbox{width:72px}.mapbox canvas{width:72px;height:72px}.mapbox #location{display:none}'],
 ['short landscape not applied to narrow portrait','@media(min-width:440px) and (max-width:760px) and (max-height:480px) and (orientation:landscape)'],
 ['expanded landscape actions fit two columns','#nearby-controls #craft-controls:has(#craft-more[open]){grid-template-columns:repeat(2,minmax(44px,1fr))}#nearby-controls #craft-more[open]{grid-column:1/-1}'],
 ['whole mobile atlas can scroll','padding-bottom:max(12px,env(safe-area-inset-bottom));overflow-y:auto;overscroll-behavior:contain}.atlas-inner>*{flex-shrink:0}'],
 ['short landscape summary cannot compress action columns','#nearby-controls #craft-more[open]>summary{position:static;width:100%}#nearby-controls #craft-more[open]>#craft-secondary-actions{margin-left:0}'],
 ['atlas tracks include their gap','.atlas-body{min-height:242px}'],
 ['atlas close header remains sticky','.atlas-head{position:sticky;top:0;background:#162224;z-index:2}'],
 ['all route targets have 44px minimum','.atlas-route button{font-size:11px;min-height:44px}'],
 ['map still keyboard reachable','class="mapbox" role="button" tabindex="0"'],
 ['action feedback exists','id="craft-feedback" role="status" aria-live="polite"'],
 ['pause and reset remain in existing details','<div id="craft-recovery"><button type="button" id="craft-pause" hidden>暂停</button><button type="button" id="craft-reset" hidden>复位展陈</button></div></details>']
];for(const[name,text]of sourceChecks)assert(html.includes(text),name);
const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
const rows=[];
for(const[width,height]of [[320,480],[440,320],[320,640],[360,640],[390,844],[480,320],[640,360],[768,1024]])for(const safeBottom of [0,34]){
 if(width>760){rows.push({width,height,safeBottom,scope:'Existing desktop/tablet positioning; new controls remain in original right card, no bounded mobile formula claimed'});continue;}
 const joyBottom=Math.max(46,12+safeBottom),joySize=132,short=width>=440&&height<=480&&width>height,compact=width<=480&&height<=600&&height>=width;
 const dock=short?{x:180,right:width-132,y:110,bottom:height-Math.max(134,safeBottom)}:{x:14,right:width-14,y:compact?224:292,bottom:height-joyBottom-joySize-28};
 const map={x:14,right:14+(compact?72:108),y:140,bottom:140+(compact?72:108+7+9*1.6)};
 const joystick={x:34,right:166,y:height-joyBottom-joySize,bottom:height-joyBottom};
 const jump={x:width-28-(width<=384?64:88+64),right:width-28-(width<=384?0:88),y:height-(width<=384?Math.max(46,safeBottom)+90:Math.max(46,safeBottom))-64,bottom:height-(width<=384?Math.max(46,safeBottom)+90:Math.max(46,safeBottom))};
 const sprint={x:width-106,right:width-28,y:height-Math.max(46,safeBottom)-78,bottom:height-Math.max(46,safeBottom)};
 const viewpad={x:width-96,right:width-20,y:140,bottom:206};
 assert(dock.right-dock.x>=110&&dock.bottom-dock.y>=44,'scroll strip has at least one reachable 44px target '+width+'x'+height);
 for(const[name,control]of Object.entries({map,joystick,jump,sprint,viewpad}))assert(!overlaps(dock,control),'bounded dock does not cover '+name+' '+width+'x'+height);
 // Count EVERY added row, including multi-line feedback and recovery. This is
 // a conservative content model; overflow must remain scrollable, never clipped.
 const content={paddingAndBorder:14,status:26,longFeedback:42,primaryAndSecondary:44,recovery:44,rowGaps:16,readingCard:68,cardGap:8};
 const contentHeight=Object.values(content).reduce((a,b)=>a+b,0),availableHeight=dock.bottom-dock.y;
 rows.push({width,height,safeBottom,dock,map,content,contentHeight,availableHeight,requiresScrolling:contentHeight>availableHeight});
}
const report={passed:true,scope:'Source contract and bounded rectangle arithmetic only. Not actual DOM, font wrapping, native touch, WebGL, or pixel verification.',sourceChecks:sourceChecks.map(r=>r[0]),rows};
fs.mkdirSync(root+'/qa-results/masterplan/layout',{recursive:true});fs.writeFileSync(root+'/qa-results/masterplan/layout/source-bounds-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,sourceChecks:sourceChecks.length,boundedCases:rows.length,scope:report.scope},null,2));
