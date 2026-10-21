/* Pure-data geography contract. This is not rendered mesh or movement proof. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'assets/exploration-geography.js'),source=fs.readFileSync(file,'utf8'),G=require(file),failures=[];
const check=(value,message)=>{try{assert(value,message);}catch(e){failures.push(e.message);}};
const near=(a,b,e=1e-7)=>Math.abs(a-b)<=e;
check(G.boundary.maxX-G.boundary.minX===2800&&G.boundary.maxZ-G.boundary.minZ===2400,'world is 2.8 by 2.4 km');check(G.SEA_Y===0,'sea level is zero');
check(G.places.length===26&&new Set(G.places.map(p=>p.id)).size===26,'26 unique stable locations');check(G.islands.length===12,'12 independently bounded landmasses');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),literal=html.match(/const LINKS = (\[[\s\S]*?\n\]);/);assert(literal,'source LINKS literal');const links=vm.runInNewContext(literal[1]);
const margins=[],padProof=[];let minSpacing=Infinity;
for(const p of G.places){
 check(p.index===p.sourceId&&p.id==='source-'+p.index,'stable source identity '+p.index);check(p.title===links[p.index].title&&p.url===links[p.index].url,'source title/url retained '+p.index);
 const island=G.islands.find(i=>i.id===p.islandId);check(!!island,'place island exists '+p.index);const radius=p.index===23?100:50;let maximumHeightError=0,minimumEdgeDistance=Infinity;
 for(let j=0;j<720;j++){const a=j*Math.PI/360,x=p.x+Math.cos(a)*radius,z=p.z+Math.sin(a)*radius,s=G.surface(x,z,{altitude:Infinity});check(s&&s.islandId===p.islandId,'full pad supported '+p.index);if(s)maximumHeightError=Math.max(maximumHeightError,Math.abs(s.height-p.y));const r=Math.hypot((x-island.x)/island.rx,(z-island.z)/island.rz);minimumEdgeDistance=Math.min(minimumEdgeDistance,(1-r)*Math.min(island.rx,island.rz));}
 check(maximumHeightError<1e-7,'full building/checkpoint pad flat '+p.index);padProof.push({index:p.index,radius,maximumHeightError,minimumEdgeDistance});
 const spawn=G.safeSpawn(p);check(spawn&&spawn.islandId===p.islandId&&near(spawn.y,p.y),'safe flat geography spawn '+p.index);check(JSON.stringify(spawn)===JSON.stringify(G.safeSpawn(p)),'deterministic safe spawn '+p.index);
 for(const q of G.places)if(q.index>p.index){const d=Math.hypot(p.x-q.x,p.z-q.z);minSpacing=Math.min(minSpacing,d);check(d>=110,'building spacing '+p.index+'/'+q.index);}
 if(island.kind==='sky')check(G.surface(p.x,p.z,{altitude:p.y-5})===null,'sky not a floor beneath its altitude '+p.index);
}
// Authored outlines remain within the original convex ellipse envelopes.
// A positive separating-axis margin proves disjointness
// for the complete footprints, rather than only sampled edge points.
for(let a=0;a<G.islands.length;a++)for(let b=a+1;b<G.islands.length;b++){const i=G.islands[a],j=G.islands[b];let separation=-Infinity;
 for(let k=0;k<720;k++){const theta=k*Math.PI/720,nx=Math.cos(theta),nz=Math.sin(theta),centres=Math.abs((j.x-i.x)*nx+(j.z-i.z)*nz),support=Math.hypot(i.rx*nx,i.rz*nz)+Math.hypot(j.rx*nx,j.rz*nz);separation=Math.max(separation,centres-support);}
 check(separation>0,'disjoint complete island footprints '+i.id+'/'+j.id);margins.push({a:i.id,b:j.id,separation});}
let coastSamples=0;for(const i of G.islands){check(G.withinBounds(i.x-i.rx,i.z-i.rz)&&G.withinBounds(i.x+i.rx,i.z+i.rz),'island within world '+i.id);for(let k=0;k<64;k++){const a=k*Math.PI/32,{x,z}=G.boundaryPoint(i,a),s=G.surface(x,z);check(s&&s.islandId===i.id,'outer coast remains queryable '+i.id);if(s)check(near(s.height,i.kind==='sky'?i.y-4:G.SEA_Y-2),'outer rim height '+i.id);coastSamples++;}
 if(['western-mainland','eastern-book-coast'].includes(i.id))for(const p of G.places.filter(p=>p.islandId===i.id))for(let k=0;k<=100;k++){const t=k/100,s=G.surface(i.x+(p.x-i.x)*t,i.z+(p.z-i.z)*t);check(s&&s.islandId===i.id&&near(s.height,i.y),'continuous flat mainland driving terrain '+p.index);}}
const dockProof=[];for(const d of G.docks){const i=G.islands.find(i=>i.id===d.islandId),s=G.surface(d.land.x,d.land.z),span=Math.hypot(d.water.x-d.land.x,d.water.z-d.land.z),minorCoastGap=Math.abs(d.water.x-i.x)-i.rx;
 check(i.kind==='land','no water dock on sky '+d.id);check(s&&s.islandId===i.id&&s.height>0&&s.height<1&&near(s.height,d.land.y),'low dry dock point '+d.id);check(span<=18,'boarding pair within18m '+d.id);check(minorCoastGap>=6-1e-7,'water point6m beyond shoreline '+d.id);check(G.isWater(d.water.x,d.water.z,4),'clear water for4m hull '+d.id);
 check(G.nearestDock(d.land).id===d.id,'nearest dock lookup '+d.id);check(G.nearestDock(d.water,{side:'water'}).id===d.id,'nearest water dock lookup '+d.id);dockProof.push({id:d.id,span,landY:s?.height,waterClearance:minorCoastGap});}
check(G.docks.length===G.islands.filter(i=>i.kind==='land').length,'one dock per ground landmass');check(G.safeSpawn(G.spawn)&&!G.isWater(G.spawn.x,G.spawn.z),'arrival is safely dry');
check(G.surface(NaN,0)===null&&G.surface(0,Infinity)===null,'invalid queries rejected');check(G.surface(1401,0)===null&&!G.isWater(1401,0),'outside world is not navigable');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(source,ctx);check(JSON.stringify(ctx.window.CourtyardExplorationGeography.places)===JSON.stringify(G.places),'browser and Node data agree');
const report={passed:failures.length===0,createdAt:new Date().toISOString(),sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),places:G.places.length,islands:G.islands.length,minimumBuildingSpacing:minSpacing,minimumIslandSeparation:Math.min(...margins.map(m=>m.separation)),fullPadChecks:padProof,coastSamples,docks:dockProof,failures,scope:'Analytic geography and deterministic query unit tests only. Exact rendered terrain, road/foot agreement, original walker, vehicle hull, boat boarding and WebGL require separate integration acceptance.'};
const out=path.join(root,'qa-results/exploration');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'geography-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
