/* Deterministic, render-independent geography for the exploration world.
 * Metres, +Y up. Stable source indices retain the original LINKS/readings IDs.
 * Each authored coast stays within its original separating ellipse envelope.
 * The physical inner .75 ellipse remains a flat driving/building plateau.
 * The last beach metres are explicit below-sea terrain, never missing floor.
 * Geometry callers must triangulate these samples and use their actual faces
 * for movement. This analytic field is the geography, not a raycast substitute. */
(function(global){
 'use strict';
 const SEA_Y=0,boundary=Object.freeze({minX:-1400,maxX:1400,minZ:-1200,maxZ:1200});
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const TAU=Math.PI*2,PLATEAU=.75;
 const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 // These are broad authored bays, not a repeated noise/scallop function. The
 // uncut envelope between them becomes each region's headlands. No bay enters
 // a land island's dock-bearing wedge; both the radius and derivative there
 // are exactly unchanged. All cuts are inward, retaining the envelope proof.
 const coastSpecs={
  'arrival':{character:'sheltered southern bay and northwestern shoulder',palette:[0x73816b,0xb5ab88,0x657477],bays:[[1.64,.70,.13],[-2.05,.66,.08]]},
  'western-mainland':{character:'three broad headlands, western cove and long southern bay',palette:[0x687966,0xa9a385,0x596e69],bays:[[1.38,.62,.21],[-1.44,.90,.12],[3.12,.48,.11]],relief:[[-2.35,.52,3.2]]},
  'eastern-book-coast':{character:'long northern inlet and unequal southeastern bookend capes',palette:[0x79806b,0xb8ad90,0x777b70],bays:[[-1.32,.70,.20],[.84,.64,.15],[2.22,.59,.11]],relief:[[.03,.5,2.6]]},
  'service-rss':{character:'a single open southern crescent with a small northwestern cove',palette:[0x6f806a,0xb4ad8a,0x64766b],bays:[[1.35,.66,.13],[-2.1,.53,.065]]},
  'service-vault':{character:'a recessed northern basin and broad southern headland',palette:[0x67766b,0xa8a58c,0x596e70],bays:[[-1.69,.76,.14],[1.02,.48,.06]]},
  'service-api':{character:'a southwestern bay balanced by a slender northeast shoulder',palette:[0x6b7c72,0xa8b09b,0x5c7477],bays:[[2.04,.69,.14],[-1.06,.66,.07]]},
  'service-bid':{character:'a northern inlet and a low, round southern cape',palette:[0x7e8069,0xbcb08f,0x787864],bays:[[-1.48,.64,.14],[.86,.59,.065]]},
  'service-reme':{character:'a southeastern haven beneath an extended northern shoulder',palette:[0x72816f,0xb5b49a,0x677a74],bays:[[1.16,.75,.14],[-.96,.57,.06]]},
  'butterfly-island':{character:'two unequal winglike capes around a southeastern recess',palette:[0x7f8372,0xc1b79e,0x7b8080],bays:[[.83,.62,.10],[-1.92,.67,.075]]},
  'sky-versions':{character:'a broad southern hollow and a long northern cloud cape',palette:[0x959e8b,0xc5bea3,0x6f7d7b],bays:[[1.4,.68,.17],[-2.36,.55,.07]],undersideDepth:57},
  'sky-mindcare':{character:'an asymmetric western cloud basin and eastern shoulder',palette:[0x8f9e94,0xb8c1ac,0x687e7e],bays:[[2.83,.72,.18],[-.77,.6,.09]],undersideDepth:64},
  'sky-github':{character:'a northern cloud inlet between two unequal headlands',palette:[0x939c8c,0xc6bfa3,0x708079],bays:[[-1.3,.73,.16],[1.52,.67,.105]],undersideDepth:69}
 };
 function freezeCoast(spec){return Object.freeze({character:spec.character,palette:Object.freeze({land:spec.palette[0],beach:spec.palette[1],rock:spec.palette[2]}),bays:Object.freeze(spec.bays.map(([angle,width,depth])=>Object.freeze({angle,width,depth}))),relief:Object.freeze((spec.relief||[]).map(([angle,width,height])=>Object.freeze({angle,width,height}))),undersideDepth:spec.undersideDepth||0});}
 const islands=[
  {id:'arrival',name:'起航之庭',x:0,z:300,rx:150,rz:170,y:4,kind:'land'},
  {id:'western-mainland',name:'造物大陆',x:-720,z:-220,rx:530,rz:690,y:8,kind:'land'},
  {id:'eastern-book-coast',name:'未完之书海岸',x:650,z:-250,rx:500,rz:670,y:10,kind:'land'},
  {id:'service-rss',name:'订阅岛',x:-1040,z:850,rx:160,rz:180,y:6,kind:'land'},
  {id:'service-vault',name:'钥匙岛',x:-620,z:850,rx:160,rz:180,y:6,kind:'land'},
  {id:'service-api',name:'往返岛',x:-200,z:880,rx:160,rz:190,y:6,kind:'land'},
  {id:'service-bid',name:'条理岛',x:220,z:850,rx:160,rz:180,y:6,kind:'land'},
  {id:'service-reme',name:'守望岛',x:650,z:850,rx:160,rz:180,y:6,kind:'land'},
  {id:'butterfly-island',name:'未上色的蝴蝶岛',x:1190,z:650,rx:180,rz:250,y:12,kind:'land'},
  {id:'sky-versions',name:'五稿云屿',x:-760,z:-1070,rx:150,rz:100,y:180,kind:'sky'},
  {id:'sky-mindcare',name:'心事云屿',x:-200,z:-1070,rx:150,rz:100,y:230,kind:'sky'},
  {id:'sky-github',name:'造物云屿',x:400,z:-1070,rx:150,rz:100,y:280,kind:'sky'}
 ].map(i=>Object.freeze({...i,coast:freezeCoast(coastSpecs[i.id])}));
 const byIsland=new Map(islands.map(i=>[i.id,i]));
 const titles=['墨息','画韵新生','画韵新生·旧址','墨生','暖聆','暖聆App','排版助手','金陵专利局','RSS','Vaultwarden','API','标书','Reme','AI两年','凝结核列传','从因到果','哭泣的城市','双星记','思想者的五个版本','置身青媒内','月雪','清样之前','拓片','未上色的蝴蝶','MindCareAI','GitHub'];
 const urls=['https://moxi.maniforld.com','https://huayun.maniforld.com','https://hyxs.art','https://mosheng.maniforld.com','https://nuanling.maniforld.com','https://nuanling.maniforld.com/app/','https://editor.maniforld.com','https://patent.maniforld.com','https://rss.maniforld.com','https://vault.maniforld.com','https://api.maniforld.com','https://biaoshu.maniforld.com','https://reme.maniforld.com','/?read=13','/?read=14','/?read=15','https://crying-city.maniforld.com','https://double-stars.maniforld.com','https://five-versions.maniforld.com','/?read=19','/?read=20','https://qingyang-before-proof.maniforld.com','https://rubbing.maniforld.com','https://uncolored-butterfly.maniforld.com','https://k.playe.top','https://github.com/Lx050'];
 const places=[];
 function place(index,islandId,dx=0,dz=0){const i=byIsland.get(islandId);places.push(Object.freeze({id:'source-'+index,sourceId:index,index,title:titles[index],url:urls[index],x:i.x+dx,y:i.y,z:i.z+dz,islandId,padRadius:index===23?100:50}));}
 [[-210,-310],[0,-310],[210,-310],[-210,0],[210,0],[-210,310],[0,310],[210,310]].forEach(([x,z],index)=>place(index,'western-mainland',x,z));
 ['service-rss','service-vault','service-api','service-bid','service-reme'].forEach((id,i)=>place(8+i,id));
 [13,14,15,16,17,19,20,21,22].forEach((index,i)=>place(index,'eastern-book-coast',(i%3-1)*200,(Math.floor(i/3)-1)*310));
 place(18,'sky-versions');place(23,'butterfly-island');place(24,'sky-mindcare');place(25,'sky-github');places.sort((a,b)=>a.index-b.index);
 function withinBounds(x,z,margin=0){return Number.isFinite(x)&&Number.isFinite(z)&&x>=boundary.minX+margin&&x<=boundary.maxX-margin&&z>=boundary.minZ+margin&&z<=boundary.maxZ-margin;}
 function resolve(i){return typeof i==='string'?byIsland.get(i):i;}
 // A compact raised-cosine bay has zero first derivative at both joins.
 function lobe(angle,center,width){const d=angleDistance(angle,center);return d>=width?0:(1+Math.cos(Math.PI*d/width))*.5;}
 function boundaryRadius(i,angle){i=resolve(i);if(!i||!Number.isFinite(angle))return null;return 1-i.coast.bays.reduce((sum,b)=>sum+b.depth*lobe(angle,b.angle,b.width),0);}
 function coordinates(i,x,z){
  i=resolve(i);if(!i||!Number.isFinite(x)||!Number.isFinite(z))return null;
  const dx=(x-i.x)/i.rx,dz=(z-i.z)/i.rz,q=Math.hypot(dx,dz),angle=Math.atan2(dz,dx),edge=boundaryRadius(i,angle);
  return {island:i,angle,q,edge,r:q<=PLATEAU?q:PLATEAU+(q-PLATEAU)*(1-PLATEAU)/(edge-PLATEAU)};
 }
 function heightAt(i,r,angle){
  if(r>1+1e-10)return null;r=Math.max(0,Math.min(1,r));
  if(i.kind==='sky')return i.y-4*(1-smooth((1-r)/.25));
  const depth=(1-r)*Math.min(i.rx,i.rz),shoreWidth=Math.min(i.rx,i.rz)*.25;
  let y;if(depth<=5)y=SEA_Y-2+2.6*smooth(depth/5);else if(depth<=14)y=SEA_Y+.6;else y=SEA_Y+.6+(i.y-SEA_Y-.6)*smooth((depth-14)/(shoreWidth-14));
  // Two low mainland shoulders only. Their complete supports are outside the
  // protected .75 core, outside every building pad, and away from dock wedges.
  // A sin² radial envelope meets the untouched plateau and beach with C1 joins.
  if(r>PLATEAU&&r<.93){const t=(r-PLATEAU)/(.93-PLATEAU),radial=Math.sin(Math.PI*t)**2;for(const hill of i.coast.relief)y+=hill.height*radial*lobe(angle,hill.angle,hill.width);}
  return y;
 }
 function sample(i,radialFraction,angle){
  i=resolve(i);if(!i||!Number.isFinite(radialFraction)||radialFraction<0||radialFraction>1||!Number.isFinite(angle))return null;
  const edge=boundaryRadius(i,angle),q=radialFraction<=PLATEAU?radialFraction:PLATEAU+(radialFraction-PLATEAU)*(edge-PLATEAU)/(1-PLATEAU);
  return {x:i.x+Math.cos(angle)*i.rx*q,y:heightAt(i,radialFraction,angle),z:i.z+Math.sin(angle)*i.rz*q};
 }
 function boundaryPoint(i,angle){return sample(i,1,angle);}
 function height(i,x,z){const c=coordinates(i,x,z);return c?heightAt(c.island,c.r,c.angle):null;}
 function skyBottom(i,x,z){const c=coordinates(i,x,z);return !c||c.island.kind!=='sky'||c.r>1+1e-10?null:c.island.y-6-(c.island.coast.undersideDepth-6)*(1-smooth(c.r));}
 // Euclidean clearance uses a 512-segment boundary approximation plus a
 // certified chord-error allowance. |B''| <= R*(1+2|f'|+|f''|), with the
 // raised-cosine derivative bounds summed over all authored bays. This makes
 // insets/outsets conservative without treating concave bays as solid land.
 const outlines=new Map(),OUTLINE_STEPS=512;
 for(const i of islands){const step=TAU/OUTLINE_STEPS,d1=i.coast.bays.reduce((n,b)=>n+b.depth*Math.PI/(2*b.width),0),d2=i.coast.bays.reduce((n,b)=>n+b.depth*Math.PI*Math.PI/(2*b.width*b.width),0),error=Math.max(i.rx,i.rz)*(1+2*d1+d2)*step*step/8,points=Array.from({length:OUTLINE_STEPS},(_,k)=>boundaryPoint(i,k*step)),segments=points.map((a,k)=>{const b=points[(k+1)%OUTLINE_STEPS];return {a,b,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};});outlines.set(i.id,{segments,error});}
 function nearBoundary(i,x,z,distance){const o=outlines.get(i.id),radius=distance+o.error,r2=radius*radius;for(const s of o.segments){if(x<s.minX-radius||x>s.maxX+radius||z<s.minZ-radius||z>s.maxZ+radius)continue;const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=Math.max(0,Math.min(1,((x-s.a.x)*dx+(z-s.a.z)*dz)/(dx*dx+dz*dz)));if((x-s.a.x-dx*t)**2+(z-s.a.z-dz*t)**2<=r2)return true;}return false;}
 // contains(islandOrId,x,z,margin) tests the actual authored footprint.
 // Positive margins are conservative Euclidean insets, negatives outsets.
 // The two-coordinate overload continues to test the bounded world.
 function contains(i,x,z,margin=0){if(typeof i==='number')return withinBounds(i,x,z||0);const c=coordinates(i,x,z);if(!c||!Number.isFinite(margin))return false;const inside=c.r<=1+1e-10;if(!margin)return inside;return margin>0?inside&&!nearBoundary(c.island,x,z,margin):inside||nearBoundary(c.island,x,z,-margin);}
 function surface(x,z,options={}){
  if(!withinBounds(x,z))return null;const altitude=options.altitude??Infinity;if(Number.isNaN(altitude))return null;let found=null;
  for(const i of islands){const y=height(i,x,z);if(y===null||y>altitude+1e-8)continue;if(!found||y>found.height)found={height:y,y,islandId:i.id,id:i.id,kind:i.kind};}return found;
 }
 function isWater(x,z,clearance=0){
  if(!Number.isFinite(clearance)||clearance<0||!withinBounds(x,z,clearance))return false;
  // Sky islands leave navigable ocean beneath them. A hull may enter a broad
  // bay only if its full clearance stays beyond the same authored boundary.
  return !islands.some(i=>i.kind==='land'&&(contains(i,x,z)||clearance>0&&nearBoundary(i,x,z,clearance)));
 }
 const docks=islands.filter(i=>i.kind==='land').map(i=>{
  const direction=i.x>0?-1:1,land={x:i.x+direction*(i.rx-8),z:i.z};land.y=height(i,land.x,land.z);
  const water={x:i.x+direction*(i.rx+6),y:SEA_Y,z:i.z};
  return Object.freeze({id:'dock-'+i.id,islandId:i.id,land:Object.freeze(land),water:Object.freeze(water)});
 });
 const spawn=Object.freeze({x:0,y:4,z:300,islandId:'arrival'});
 function safeSpawn(target=spawn,options={}){
  const p=typeof target==='number'?places[target]:typeof target==='string'?places.find(p=>p.id===target)||byIsland.get(target):target;
  if(!p)return null;const clearance=options.clearance??2,altitude=options.altitude??Infinity,maxRadius=options.maxRadius??60;
  const accept=(x,z)=>{const s=surface(x,z,{altitude});if(!s||s.height<=SEA_Y+.1||options.islandId&&s.islandId!==options.islandId)return null;const i=byIsland.get(s.islandId);if(!contains(i,x,z,clearance))return null;for(const [dx,dz]of [[clearance,0],[-clearance,0],[0,clearance],[0,-clearance]]){const q=surface(x+dx,z+dz,{altitude});if(!q||q.islandId!==s.islandId||Math.abs(q.height-s.height)>.08)return null;}return{x,y:s.height,z,islandId:s.islandId};};
  let q=accept(p.x,p.z);if(q)return q;for(let r=2;r<=maxRadius;r+=2)for(let k=0;k<32;k++){const a=k*Math.PI/16;q=accept(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r);if(q)return q;}return null;
 }
 function nearestDock(p,zOrOptions,options={}){
  let x,z;if(typeof p==='number'){x=p;z=zOrOptions;}else{x=p?.x;z=p?.z;options=zOrOptions||{};}if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  let best=null,distance=options.maxDistance??Infinity;for(const d of docks){if(options.islandId&&d.islandId!==options.islandId)continue;const point=options.side==='water'?d.water:d.land,n=Math.hypot(x-point.x,z-point.z);if(n<distance){distance=n;best=d;}}return best?{...best,distance}:null;
 }
 const api=Object.freeze({SEA_Y,boundary,islands:Object.freeze(islands),places:Object.freeze(places),docks:Object.freeze(docks),spawn,surface,isWater,contains,withinBounds,safeSpawn,nearestDock,boundaryPoint,boundaryRadius,sample,skyBottom,plateauFraction:PLATEAU});
 global.CourtyardExplorationGeography=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
