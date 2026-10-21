/* 通衢大道 · 曲径通幽 · 旁逸斜出.
 * The host owns direct spines/rings. This layer adds a quiet meander and four
 * short, connected detours into existing pause pockets, not new destinations.
 * All paving is clipped to the actual host terrain triangles by roadSurface. */
(function(global){
 'use strict';
 const BUDGET=Object.freeze({draws:6,triangles:18000,materials:3,lights:0,particles:0});
 const radial=(r,a)=>({x:Math.sin(a)*r,z:Math.cos(a)*r});
 function build({THREE:T,surface,pockets,islandRoads}){
  if(!T||!surface||!pockets)throw Error('Road hierarchy requires the shared rendered terrain surface and existing pockets');
  const root=new T.Group();root.name='courtyard-road-hierarchy';
  const owned=[],surfaces=[],corridors=[];
  function material(name,color,roughness){const m=new T.MeshStandardMaterial({color,roughness,vertexColors:true});m.name=name;m.color.convertSRGBToLinear();owned.push(m);surfaces.push({material:m,kind:'paving',exposure:1});return m;}
  const bed=material('road-fine-joints',0x59665d,.98),quiet=material('road-quiet-sage-stone',0x8e9c8d,.94),branch=material('road-detour-warm-aggregate',0xaaa28c,.99);
  function sample(controls){
   const curve=new T.CatmullRomCurve3(controls.map(p=>new T.Vector3(p.x,0,p.z)),false,'centripetal');
   const n=Math.max(2,Math.ceil(curve.getLength()/.55));
   return curve.getSpacedPoints(n).map(p=>({x:p.x,z:p.z}));
  }
  const quietControls=[[34,80],[38,94],[35.8,104],[40.5,116],[37,123],[34,130]].map(([r,a])=>radial(r,a*Math.PI/180));
  corridors.push({id:'quiet-meander',name:'曲径通幽',kind:'quiet',width:2.2,points:sample(quietControls),connects:['ring-34','ring-34'],pocket:null});
  for(const pocket of pockets){
   const radius=Math.hypot(pocket.x,pocket.z),a=Math.atan2(pocket.x,pocket.z),start=pocket.zone===2?40.5:34;
   const controls=pocket.zone===2?[radial(start,a),radial(radius-4,a),{x:pocket.x,z:pocket.z}]:[
    radial(start,a),radial(start+4,a+.035),radial(radius-6,a-.025),radial(radius-3,a),{x:pocket.x,z:pocket.z}];
   corridors.push({id:'pocket-branch-'+pocket.zone,name:'旁逸斜出 · '+['作坊歇脚','服务小憩','雨亭听风','远眺留白'][pocket.zone],kind:'branch',width:1.8,points:sample(controls),connects:[pocket.zone===2?'quiet-meander':'ring-34','pocket-'+pocket.zone],pocket:pocket.zone});
  }
  const layers=new Map();
  function add(layer,mat,points,offset,color){layers.set(layer,mat);surface.addPolygon(points,{offset,color,layer,walkable:true,overlapGroup:layer==='hierarchy-joints'?'hierarchy-joints':'hierarchy-courses'});}
  function ribbon(path){
   const points=path.points,half=path.width/2;let distance=0;
   function edge(i,side){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z),p=points[i];return{x:p.x+(b.z-a.z)/length*side,z:p.z-(b.x-a.x)/length*side};}
   for(let i=1;i<points.length;i++){
    const p=points[i-1],q=points[i],length=Math.hypot(q.x-p.x,q.z-p.z),mat=path.kind==='quiet'?quiet:branch;
    // The narrow continuous base remains walkable through the centimetre joints.
    add('hierarchy-joints',bed,[edge(i-1,-half),edge(i,-half),edge(i,half),edge(i-1,half)],.020,[1,1,1]);
    // One fine transverse joint every ~1.1m, with restrained stone variation.
    // Edges remain continuous; no stepping stones or mandatory jumps.
    const joint=Math.floor(distance/1.1)!==Math.floor((distance+length)/1.1),end=joint?Math.max(.12,1-.035/length):1;
    const a=edge(i-1,-half+.025),b=edge(i-1,half-.025),c=edge(i,-half+.025),d=edge(i,half-.025);
    const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
    const tint=1+Math.sin((i+path.id.length*17)*1.37)*.025;
    add('hierarchy-'+path.kind,mat,[a,mix(a,c,end),mix(b,d,end),b],.039,[tint,tint,tint]);
    distance+=length;
   }
  }
  corridors.forEach(ribbon);
  for(const [layer,mat]of layers){const mesh=surface.buildMesh(mat,layer);mesh.name=layer;mesh.userData.roadSurface=true;mesh.receiveShadow=true;mesh.castShadow=false;root.add(mesh);}
  function inspect(){let draws=0,triangles=0;root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return{draws,triangles,materials:owned.length,lights:0,particles:0,corridors:corridors.length,budget:BUDGET};}
  function dispose(){root.parent?.remove(root);root.traverse(o=>o.geometry?.dispose());owned.forEach(m=>m.dispose());}
  return{root,surfaces,corridors,inspect,dispose,mainCorridors:islandRoads?.corridors||[],metadata:{names:['通衢大道','曲径通幽','旁逸斜出'],pocketCount:pockets.length}};
 }
 global.CourtyardRoadHierarchy=Object.freeze({build,budget:BUDGET});
})(window);
