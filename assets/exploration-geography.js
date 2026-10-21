/* Deterministic, render-independent geography for the exploration world.
 * Metres, +Y up. Stable source indices retain the original LINKS/readings IDs.
 * Each landmass is an ellipse with one broad flat driving/building plateau.
 * The last beach metres are explicit below-sea terrain, never missing floor.
 * Geometry callers must triangulate these samples and use their actual faces
 * for movement. This analytic field is the geography, not a raycast substitute. */
(function(global){
 'use strict';
 const SEA_Y=0,boundary=Object.freeze({minX:-1400,maxX:1400,minZ:-1200,maxZ:1200});
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
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
 ].map(Object.freeze);
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
 function radius(i,x,z,margin=0){i=resolve(i);if(!i||!Number.isFinite(x)||!Number.isFinite(z)||i.rx<=margin||i.rz<=margin)return Infinity;return Math.hypot((x-i.x)/(i.rx-margin),(z-i.z)/(i.rz-margin));}
 // contains(islandOrId,x,z,margin) tests an inset island footprint. The two-
 // coordinate form contains(x,z,margin) tests the bounded exploration world.
 function contains(i,x,z,margin=0){return typeof i==='number'?withinBounds(i,x,z||0):radius(i,x,z,margin)<=1+1e-12;}
 function height(i,x,z){
  const r=radius(i,x,z);if(r>1+1e-12)return null;
  if(i.kind==='sky')return i.y-4*(1-smooth((1-r)/.25));
  const depth=(1-r)*Math.min(i.rx,i.rz),shoreWidth=Math.min(i.rx,i.rz)*.25;
  if(depth<=5)return SEA_Y-2+2.6*smooth(depth/5);
  if(depth<=14)return SEA_Y+.6;
  return SEA_Y+.6+(i.y-SEA_Y-.6)*smooth((depth-14)/(shoreWidth-14));
 }
 function surface(x,z,options={}){
  if(!withinBounds(x,z))return null;const altitude=options.altitude??Infinity;if(Number.isNaN(altitude))return null;let found=null;
  for(const i of islands){const y=height(i,x,z);if(y===null||y>altitude+1e-8)continue;if(!found||y>found.height)found={height:y,y,islandId:i.id,id:i.id,kind:i.kind};}return found;
 }
 function isWater(x,z,clearance=0){
  if(!withinBounds(x,z,clearance))return false;
  // Sky footprints do not make the ocean below them solid. Expand every land
  // footprint conservatively so a hull with clearance never clips a beach.
  return !islands.some(i=>i.kind==='land'&&Math.hypot((x-i.x)/(i.rx+clearance),(z-i.z)/(i.rz+clearance))<=1);
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
 const api=Object.freeze({SEA_Y,boundary,islands:Object.freeze(islands),places:Object.freeze(places),docks:Object.freeze(docks),spawn,surface,isWater,contains,withinBounds,safeSpawn,nearestDock,plateauFraction:.75});
 global.CourtyardExplorationGeography=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
