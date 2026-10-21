/* At-grade courtyard masterplan. The site/building transforms and movement model
 * remain owned by the host. Repeated landscape pieces are pooled by material;
 * solid furniture publishes real collision boxes, never an invisible plaza slab. */
(function (global) {
  'use strict';
  const ANCHORS = Object.freeze({0: {role:'creative', distance:145}, 23: {role:'dynamic', distance:390}, 20: {role:'quiet', distance:155}});
  const BUDGET = Object.freeze({draws:48, triangles:20000, materials:18, lights:0, particles:0});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function labelPolicy(index, distance, active) {
    const anchor=ANCHORS[index],limit=anchor?anchor.distance:64;
    return {visible:active||distance<limit, tier:distance<22?'near':distance<64?'middle':'anchor',
      opacity:active?1:clamp(1-distance/limit,.38,anchor?.85:.76), scale:active?1.08:anchor&&distance>=64?1.12:1};
  }
  function build(options) {
    const T=options.THREE,sites=options.sites,entries=options.entries,buildings=options.buildings||[],height=options.terrainHeight;
    if(!T||!sites||!entries||!height)throw new Error('Masterplan requires exact site and terrain data');
    const root=new T.Group();root.name='courtyard-masterplan';
    const obstacles=[],shelters=[],surfaces=[],forecourts=[],pockets=[],entrances=[],batches=new Map(),patches=new Map(),ownedGeometry=[],ownedMaterials=[];
    const box=new T.BoxGeometry(1,1,1),leaf=new T.IcosahedronGeometry(1,0);ownedGeometry.push(box,leaf);
    const materials={};
    function mat(name,color,kind,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.94,...extra});m.color.convertSRGBToLinear();materials[name]=m;ownedMaterials.push(m);surfaces.push({material:m,kind,exposure:1});return m;}
    mat('works',0x99917b,'paving');mat('services',0x88958d,'paving');mat('literature',0x737e74,'paving');mat('connection',0x91a09a,'paving');
    mat('bronze',0x9a835a,'paving',{metalness:.15,roughness:.78});mat('stone',0x828d81,'paving');mat('timber',0x6c6250,'wood');
    mat('leaf',0x576c59,'vegetation');mat('shade',0x485d50,'vegetation');mat('roof',0x9b9d89,'roof');
    mat('route',0xc8ad73,'paving',{emissive:0x75603a,emissiveIntensity:.25});
    // The underside is separately authored and remains dry beneath the rain plane.
    const underside=mat('underside',0x736e5e,'wood');surfaces.find(s=>s.material===underside).exposure=0;
    const coveredPaving=mat('coveredPaving',0x737e74,'paving');surfaces.find(s=>s.material===coveredPaving).exposure=0;
    const unit=new T.Object3D();
    function piece(name,material,x,y,z,sx,sy,sz,angle=0,geometry=box){const key=name+':'+material.uuid+':'+geometry.uuid;let b=batches.get(key);if(!b){b={name,geometry,material,rows:[]};batches.set(key,b);}unit.position.set(x,y,z);unit.rotation.set(0,angle,0);unit.scale.set(sx,sy,sz);unit.updateMatrix();b.rows.push(unit.matrix.clone());}
    // Shared clipping follows each rendered terrain triangle exactly. No coarse
    // analytic quad may cut through the visible terrain at a slope transition.
    function patch(name,material,corners){
      let p=patches.get(name);if(!p){p={name,material,vertices:[],indices:[]};patches.set(name,p);}
      const offset=material===materials.bronze?.068:.052;
      if(options.surface){options.surface.addPolygon(corners,{offset,layer:'masterplan-'+name,walkable:true,color:[1,1,1],overlapGroup:offset===.068?'masterplan-inlays':'masterplan-fields'});return;}
      const n=p.vertices.length/3;for(const [x,z] of corners)p.vertices.push(x,height(x,z)+offset,z);p.indices.push(n,n+2,n+1,n,n+3,n+2);
    }
    function carpet(name,material,cx,cz,w,d,yaw=0,step=1){const nx=Math.ceil(w/step),nz=Math.ceil(d/step),c=Math.cos(yaw),s=Math.sin(yaw);const point=(x,z)=>[cx+c*x+s*z,cz-s*x+c*z];for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=-w/2+i*w/nx,b=-d/2+j*d/nz;patch(name,material,[point(a,b),point(a+w/nx,b),point(a+w/nx,b+d/nz),point(a,b+d/nz)]);}}
    const local=(site,x,z)=>({x:site.x+site.uz*x+site.ux*z,z:site.z-site.ux*x+site.uz*z});
    const radial=(r,a)=>({x:Math.sin(a)*r,z:Math.cos(a)*r});
    const roadRadii=[34,88];
    function protectedPoint(x,z,r=.5){
      if(Math.hypot(x,z)>147-r||Math.min(Math.abs(x),Math.abs(z))<2.3+r||Math.hypot(x,z)<8+r)return true;
      if(roadRadii.some(v=>Math.abs(Math.hypot(x,z)-v)<2.3+r))return true;
      for(const s of sites){const dx=x-s.x,dz=z-s.z,along=dx*s.ux+dz*s.uz,side=dx*s.uz-dz*s.ux;if(along<=0&&along>=-36-r&&Math.abs(side)<2.3+r)return true;}
      for(const b of buildings){const q=b.local?b.local(new T.Vector3(x,height(x,z),z)):null;if(!q)continue;if(Math.abs(q.x)<b.width/2+r+1&&Math.abs(q.z)<b.depth/2+r+1)return true;}
      if((options.scenery||[]).some(p=>Math.hypot(x-p.x,z-p.z)<r+1))return true;
      return false;
    }
    function shrub(x,z,s=.8,kind='leaf'){if(protectedPoint(x,z,s*.6))return false;piece('landscape-foliage',materials[kind],x,height(x,z)+s*.24,z,s*.62,s*.42,s*.55,0,leaf);return true;}
    // Twenty-five distinct forecourts plus the original butterfly shore landing.
    // They are thin visual fields, never a step or replacement access surface.
    const names=['works','services','literature','connection'];
    for(let i=0;i<entries.length;i++){
      const site=sites[i],b=buildings.find(b=>b.index===i),zone=entries[i].zone,name=names[zone],yaw=Math.atan2(site.ux,site.uz),front=b?-b.depth/2:-15;
      const near=Math.min(front-1,-10),far=Math.min(near-4,-16),center=local(site,0,(near+far)/2),width=zone===0?10:zone===1?5.2:zone===2?6.2:11;
      carpet('forecourt-'+name,materials[name],center.x,center.z,width,near-far,yaw);
      forecourts.push({index:i,zone,center,width,depth:near-far,yaw,atGrade:true});
      // Works: open transverse work-grid. Services: direct paired threshold lines.
      // Literature: staggered soft edges. Connection: broad open horizon fan.
      if(zone===0){for(const side of [-4,-2,2,4]){const p=local(site,side,(near+far)/2);carpet('works-grid',materials.bronze,p.x,p.z,.055,near-far,yaw);}}
      if(zone===1){for(const side of [-1.85,1.85]){const p=local(site,side,(near+far)/2);carpet('service-guides',materials.bronze,p.x,p.z,.11,near-far,yaw);}}
      if(zone===2){for(const side of [-1,1])for(let j=0;j<3;j++){const p=local(site,side*(4.4+j*.25),far+j*1.35+(side>0?.65:0));shrub(p.x,p.z,.85, i===20?'shade':'leaf');}}
      if(zone===3){for(const side of [-1,1])for(let j=0;j<3;j++){const p=local(site,side*(2.3+j*.9),near-.7-j*.9);carpet('overlook-fan',materials.bronze,p.x,p.z,.055,1.4,yaw+side*.35);}}
      if(b){const cue=local(site,-1.9,front-.8);piece('threshold-cues',materials.bronze,cue.x,site.groundY+.19,cue.z,.10,.36,.10,yaw);entrances.push({index:i,position:{x:cue.x,y:site.groundY+.19,z:cue.z},destination:local(site,0,front-1.2)});}
    }
    // A warm continuous datum connects the existing south gate to the open court.
    for(const side of [-1,1])for(let z=8;z<54;z+=2.8)carpet('arrival-inlay',materials.bronze,side*2.05,z,.10,1.8);
    for(let j=0;j<24;j++){const a=j*Math.PI/12,p=radial(6.3,a);carpet('court-compass',materials.bronze,p.x,p.z,.065,j%6===0?1.5:.7,a);}
    // Protected pocket clearings live BETWEEN routes, not in their clear widths.
    const candidates=[{zone:0,a:224,r:49},{zone:1,a:312,r:49},{zone:2,a:116,r:48},{zone:3,a:32,r:48}];
    function solid(record,name,x,y,z,sx,sy,sz,material){const m=new T.Mesh(box,material);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=false;m.receiveShadow=true;record.root.add(m);record.collisionBoxes.push(new T.Box3(new T.Vector3(x-sx/2,y-sy/2,z-sz/2),new T.Vector3(x+sx/2,y+sy/2,z+sz/2)));return m;}
    for(const c of candidates){
      const a=c.a*Math.PI/180;let p=null;
      // Bounded deterministic placement search, accepting only a generous clear disk.
      for(const r of [c.r,c.r+5,c.r-5])for(const da of [0,.08,-.08,.16,-.16]){const q=radial(r,a+da);if(!p&&!protectedPoint(q.x,q.z,4.3))p=q;}
      if(!p)continue;
      const yaw=Math.atan2(p.x,p.z),record={root:new T.Group(),width:7.4,depth:6.4,height:c.zone===2?3.4:.9,collisionBoxes:[],mechanisms:[],index:99,metadata:{masterplan:true,district:c.zone}};
      record.detail=new T.Group();record.root.add(record.detail);record.root.name='district-pause-'+names[c.zone];record.root.position.set(p.x,height(p.x,p.z),p.z);record.root.rotation.y=yaw;root.add(record.root);
      carpet('pocket-'+names[c.zone],c.zone===2?coveredPaving:materials[names[c.zone]],p.x,p.z,c.zone===2?7:7.3,c.zone===2?5.5:6.3,yaw);
      // Furniture sits on the two outside edges; the central 3m walk remains open.
      for(const side of [-1,1]){solid(record,'rest-edge-seat',side*2.65,.45,0,.65,.18,3,c.zone===2?materials.underside:materials.timber);solid(record,'seat-foot',side*2.65,.2,-1,.25,.4,.25,materials.stone);solid(record,'seat-foot',side*2.65,.2,1,.25,.4,.25,materials.stone);}
      if(c.zone===0){solid(record,'open-work-table',2.65,.85,0,.8,.1,2.4,materials.timber);}
      if(c.zone===2){
        for(const x of [-3.25,3.25])for(const z of [-2.35,2.35])solid(record,'shade-post',x,1.5,z,.15,3,.15,materials.timber);
        const roof=solid(record,'quiet-rain-canopy',0,3.15,0,7.1,.14,5.6,materials.roof);solid(record,'dry-soffit',0,3.06,0,7,.025,5.5,materials.underside);
        shelters.push({root:record.root,dynamic:false,meshes:[roof]});
      }
      record.root.updateWorldMatrix(true,true);obstacles.push(record);pockets.push({zone:c.zone,x:p.x,z:p.z,clearWidth:3,atGrade:true,style:['open-workshop','direct-rest','shaded-turn','open-overlook'][c.zone]});
      for(const side of [-1,1])for(let j=0;j<5;j++){const q=local({x:p.x,z:p.z,ux:Math.sin(yaw),uz:Math.cos(yaw)},side*4.2,-2+j);shrub(q.x,q.z,c.zone===2?1.2:.75,c.zone===2?'shade':'leaf');}
    }
    // District seams: low planting rhythm gradually changes, not four hard walls.
    for(const degrees of [60,176,272,352])for(let j=0;j<7;j++){
      const a=(degrees+(j-3)*1.4)*Math.PI/180,p=radial(101+(j%2)*3,a);shrub(p.x,p.z,.65+(j%3)*.18,j%2?'shade':'leaf');
    }
    // Anchor hierarchy is expressed by the forecourt, not by resizing monuments.
    for(const index of [0,20]){const s=sites[index],b=buildings.find(b=>b.index===index),front=b?-b.depth/2:-10,yaw=Math.atan2(s.ux,s.uz);for(const side of [-1,1]){const p=local(s,side*(index===0?5.4:4.1),front-3);carpet(index===0?'moxi-open-frame':'moonsnow-quiet-frame',materials[index===0?'bronze':'shade'],p.x,p.z,index===0?.18:.36,5,yaw);}}
    // Existing north-edge spine clips the unchanged Mosheng facade. A short
    // east-side bypass reconnects the same spine, without relocating any building.
    const repairs=[{id:'north-spine',points:[{x:0,z:-104},{x:4,z:-112},{x:4,z:-134},{x:0,z:-142}],width:3}];
    // The road network now owns this full-width reroute. Keep its established
    // route record for tours, but do not paint a duplicate lane or bronze stripe.
    const sea=options.butterflySea,s23=sites[23],butterflyAngle=Math.atan2(s23.ux,s23.uz);
    function arc(radius,a,b){let delta=(b-a+Math.PI*3)%(Math.PI*2)-Math.PI;const n=Math.max(1,Math.ceil(Math.abs(delta)*radius/1.5));return Array.from({length:n+1},(_,i)=>radial(radius,a+delta*i/n));}
    const approach=index=>{const s=sites[index],b=buildings.find(b=>b.index===index);return local(s,0,-(b?b.depth/2+2:16));};
    const spineAngle=Math.PI,axis=radial(34,spineAngle),outer=radial(88,spineAngle),landing=radial(139,butterflyAngle);
    const seaEnd=sea?radial(302,butterflyAngle):approach(23);
    const outward=[axis,outer,...arc(88,spineAngle,butterflyAngle),landing,seaEnd];
    const pilot=[{x:0,z:54},{x:0,z:0},...outward];
    const moxiAngle=Math.atan2(sites[0].ux,sites[0].uz),moonAngle=Math.atan2(sites[20].ux,sites[20].uz);
    const firstVisit=[approach(0),...arc(34,moxiAngle,spineAngle),...outward.slice(1),landing,...arc(88,butterflyAngle,moonAngle),approach(20)];
    // Route line height is host surfaceHeight, including the existing sloped causeway.
    const surface=options.surfaceHeight||height;
    const clean=points=>points.filter((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.001);
    const routes={pilot:{id:'pilot',name:'庭门 → 庭心 → 蝴蝶',points:clean(pilot)},firstVisit:{id:'firstVisit',name:'墨息 → 蝴蝶 → 月雪',points:clean(firstVisit)}};
    function routeMesh(route){const vertices=[],indices=[];for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(len/2));for(let j=0;j<n;j++){const t0=j/n,t1=Math.min(1,(j+.58)/n),dx=(b.x-a.x)/Math.max(len,.01)*.07,dz=(b.z-a.z)/Math.max(len,.01)*.07,nv=vertices.length/3;for(const [t,side] of [[t0,-1],[t1,-1],[t1,1],[t0,1]]){const x=a.x+(b.x-a.x)*t+dz*side,z=a.z+(b.z-a.z)*t-dx*side;vertices.push(x,surface(x,z)+.09,z);}indices.push(nv,nv+1,nv+2,nv,nv+2,nv+3);}}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();ownedGeometry.push(g);const m=new T.Mesh(g,materials.route);m.name='optional-route-'+route.id;m.visible=false;m.receiveShadow=false;root.add(m);route.mesh=m;}
    Object.values(routes).forEach(routeMesh);
    // The permanent pilot cues are side markings, not another trail competing with it.
    for(let i=4;i<pilot.length-1;i+=4){const p=pilot[i],r=Math.hypot(p.x,p.z);if(r>135)continue;const a=Math.atan2(p.x,p.z);for(const side of [-1,1]){const q=radial(r+side*1.95,a);carpet('pilot-wayfinding',materials.bronze,q.x,q.z,.12,.65,a);}}
    for(const p of patches.values()){let m;if(options.surface){m=options.surface.buildMesh(p.material,'masterplan-'+p.name);}else{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.vertices,3));g.setIndex(p.indices);g.computeVertexNormals();m=new T.Mesh(g,p.material);}ownedGeometry.push(m.geometry);m.name=p.name;m.userData.roadSurface=true;m.receiveShadow=true;m.castShadow=false;root.add(m);}
    for(const b of batches.values()){const m=new T.InstancedMesh(b.geometry,b.material,b.rows.length);b.rows.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.instanceMatrix.needsUpdate=true;m.name=b.name;m.castShadow=false;m.receiveShadow=true;root.add(m);}
    // Furniture shared by one pocket/material becomes one instance draw while exact
    // collision boxes remain independently testable. Roof meshes stay addressable.
    for(const o of obstacles){const grouped=new Map();for(const child of [...o.root.children]){if(!child.isMesh||child.name==='quiet-rain-canopy'||child.name==='dry-soffit')continue;const key=child.material.uuid;if(!grouped.has(key))grouped.set(key,{material:child.material,items:[]});child.updateMatrix();grouped.get(key).items.push(child);}
      for(const g of grouped.values()){const im=new T.InstancedMesh(box,g.material,g.items.length);im.name='pocket-furniture';g.items.forEach((m,i)=>{im.setMatrixAt(i,m.matrix);o.root.remove(m);});im.instanceMatrix.needsUpdate=true;im.receiveShadow=true;o.root.add(im);}}
    root.updateWorldMatrix(true,true);
    let selected=null;
    function selectRoute(id){selected=Object.hasOwn(routes,id)?id:null;Object.values(routes).forEach(r=>r.mesh.visible=r.id===selected);return selected;}
    function inspect(){let draws=0,triangles=0,instances=0;root.traverse(o=>{if(!o.isMesh||o.name==='physical-collider')return;draws++;const n=o.isInstancedMesh?o.count:1;instances+=n;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*n;});return{draws,triangles,instances,materials:ownedMaterials.length,lights:0,particles:0,forecourts:forecourts.length,pockets:pockets.length,entrances:entrances.length,selectedRoute:selected,budget:BUDGET};}
    function update(position,lightQuality=false){for(const o of obstacles)o.root.visible=Math.hypot(position.x-o.root.position.x,position.z-o.root.position.z)<(lightQuality?80:145);}
    function dispose(){root.parent?.remove(root);ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());}
    return{root,obstacles,shelters,surfaces,forecourts,pockets,entrances,routes,repairs,selectRoute,inspect,update,dispose,protectedPoint,get metadata(){return{...inspect(),pocketLayout:pockets,forecourtLayout:forecourts,localBypasses:repairs,routeLayout:Object.values(routes).map(r=>({id:r.id,name:r.name,points:r.points}))};}};
  }
  global.CourtyardMasterplan=Object.freeze({build,labelPolicy,anchors:ANCHORS,budget:BUDGET});
})(window);
