/* One geometric height field for paving and feet. Three.js r128, no dependencies.
 * A course is clipped against the REAL indexed terrain, not a fitted plane or
 * analytic-height approximation. Its complete face is therefore above ground,
 * including every old diagonal seam. Building/site transforms stay unchanged;
 * the host locally grades two bridgeheads and the butterfly shoreline inlet.
 */
(function(global){
  'use strict';
  function create({THREE:T,geometry,radius=150,fallback=()=>0}){
    const CELL=2,EPS=1e-8,groundBins=new Map(),roadBins=new Map(),footprintBins=new Map(),layers=new Map(),triangles=[];
    let polygonCount=0,walkTriangleCount=0;
    const key=(x,z)=>Math.floor(x/CELL)+','+Math.floor(z/CELL);
    const cross=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
    function bounds(points){return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};}
    function binsFor(b,visit){for(let x=Math.floor(b.minX/CELL);x<=Math.floor(b.maxX/CELL);x++)for(let z=Math.floor(b.minZ/CELL);z<=Math.floor(b.maxZ/CELL);z++)visit(x+','+z);}
    function insert(bins,face){binsFor(face.bounds,k=>{let rows=bins.get(k);if(!rows){rows=[];bins.set(k,rows);}rows.push(face);});}
    function face(a,b,c){const area=cross(a,b,c);if(Math.abs(area)<1e-11)return null;return {a,b,c,area,bounds:bounds([a,b,c])};}
    function bary(f,x,z){const u=((f.b.z-f.c.z)*(x-f.c.x)+(f.c.x-f.b.x)*(z-f.c.z))/f.area;
      const v=((f.c.z-f.a.z)*(x-f.c.x)+(f.a.x-f.c.x)*(z-f.c.z))/f.area;return [u,v,1-u-v];}
    function at(f,x,z){const w=bary(f,x,z);return f.a.y*w[0]+f.b.y*w[1]+f.c.y*w[2];}
    function contains(f,x,z){const w=bary(f,x,z);return w.every(v=>v>=-EPS&&v<=1+EPS);}
    const positions=geometry.attributes.position,indices=geometry.index.array;
    for(let i=0;i<indices.length;i+=3){const v=[indices[i],indices[i+1],indices[i+2]].map(j=>({x:positions.getX(j),y:positions.getY(j),z:positions.getZ(j)})),f=face(...v);if(f){triangles.push(f);insert(groundBins,f);}}
    function heightAt(x,z){for(const f of groundBins.get(key(x,z))||[])if(contains(f,x,z))return at(f,x,z);return fallback(x,z);}
    function roadHeightAt(x,z){let y=null;for(const f of roadBins.get(key(x,z))||[])if(contains(f,x,z)){const v=at(f,x,z);y=y===null?v:Math.max(y,v);}return y;}
    function clip(poly,a,b,sign){const result=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p)*sign,dq=cross(a,b,q)*sign,insideP=dp>=-EPS,insideQ=dq>=-EPS;if(insideP)result.push(p);if(insideP!==insideQ){const t=dp/(dp-dq);result.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});}}
      return result.filter((p,i)=>!i||Math.hypot(p.x-result[i-1].x,p.z-result[i-1].z)>1e-8);}
    function layerFor(name){let layer=layers.get(name);if(!layer){layer={positions:[],colors:[],uv:[],indices:[],polygons:0,topTriangles:0,sideTriangles:0,mesh:null,walkable:false};layers.set(name,layer);}if(layer.mesh)throw Error('Road layer already built: '+name);return layer;}
    function emit(layer,poly,ground,offset,color,walkable,depth,group,boundary){
      let vertices=poly.map(p=>({x:Math.fround(p.x),z:Math.fround(p.z),y:Math.fround(at(ground,p.x,p.z)+offset)}));
      vertices=vertices.filter((p,i)=>Math.hypot(p.x-vertices[(i+1)%vertices.length].x,p.z-vertices[(i+1)%vertices.length].z)>1e-7);
      let changed=true;while(changed&&vertices.length>=3){changed=false;for(let i=0;i<vertices.length;i++)if(Math.abs(cross(vertices[(i+vertices.length-1)%vertices.length],vertices[i],vertices[(i+1)%vertices.length]))<1e-10){vertices.splice(i,1);changed=true;break;}}
      if(vertices.length<3)return;
      // Clockwise in the x/z plane is upward in the x/y/z render space.
      if(vertices.reduce((s,p,i)=>s+p.x*vertices[(i+1)%vertices.length].z-vertices[(i+1)%vertices.length].x*p.z,0)>0)vertices.reverse();
      const n=layer.positions.length/3;
      for(const p of vertices){layer.positions.push(p.x,p.y,p.z);layer.colors.push(color.r,color.g,color.b);layer.uv.push(p.x*.6,p.z*.6);}
      for(let i=1;i<vertices.length-1;i++){const f=face(vertices[0],vertices[i],vertices[i+1]);if(!f)continue;layer.indices.push(n,n+i,n+i+1);layer.topTriangles++;if(walkable){f.offset=offset;f.group=group;insert(roadBins,f);walkTriangleCount++;}}
      if(depth>0)for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];
        // Only the original stone perimeter has a wall. Terrain-triangle cuts
        // share their top edge and must not produce hidden interior walls.
        const perimeter=boundary.some((p,j)=>{const q=boundary[(j+1)%boundary.length],length=Math.hypot(q.x-p.x,q.z-p.z);return length>1e-8&&Math.abs(cross(p,q,a))/length<.00003&&Math.abs(cross(p,q,b))/length<.00003;});if(!perimeter)continue;
        const j=layer.positions.length/3;layer.positions.push(a.x,a.y,a.z,b.x,b.y,b.z,b.x,b.y-depth,b.z,a.x,a.y-depth,a.z);for(let k=0;k<4;k++){layer.colors.push(color.r,color.g,color.b);layer.uv.push(k%2,k>1?0:1);}layer.indices.push(j,j+2,j+1,j,j+3,j+2);layer.sideTriangles+=2;}
    }
    const signedArea=poly=>poly.reduce((sum,p,i)=>sum+p.x*poly[(i+1)%poly.length].z-poly[(i+1)%poly.length].x*p.z,0)*.5;
    function subtract(poly,footprint){
      const edges=footprint.points.map((p,i)=>[p,footprint.points[(i+1)%footprint.points.length]]),sign=Math.sign(signedArea(footprint.points));let overlap=poly;
      for(const [a,b] of edges){overlap=clip(overlap,a,b,sign);if(overlap.length<3)return [poly];}
      if(Math.abs(signedArea(overlap))<1e-8)return [poly];
      let remainder=poly;const result=[];
      for(const [a,b] of edges){const outside=clip(remainder,a,b,-sign);if(outside.length>=3&&Math.abs(signedArea(outside))>1e-9)result.push(outside);remainder=clip(remainder,a,b,sign);if(remainder.length<3)break;}
      return result;
    }
    function addPolygon(points,{offset=.035,color=null,layer='stone',walkable=true,depth=0,overlapGroup=null}={}){
      const poly=points.map(p=>({x:Array.isArray(p)?p[0]:p.x,z:Array.isArray(p)?p[1]:p.z}));if(poly.length<3)return;
      const target=layerFor(layer),c=color?.isColor?color:Array.isArray(color)?new T.Color().setRGB(...color):new T.Color(color===null?0xffffff:color),bbox=bounds(poly),candidates=new Set();
      let footprints=[poly];
      if(walkable&&overlapGroup!==null){
        // Subtract original convex footprints ONCE, before terrain clipping.
        // Bounded local bins avoid recursive triangle-fragment explosion.
        const previous=new Set();binsFor(bbox,k=>{for(const p of footprintBins.get(k)||[])if(p.group===overlapGroup&&p.offset===offset)previous.add(p);});
        for(const previousPoly of previous){footprints=footprints.flatMap(p=>subtract(p,previousPoly));if(!footprints.length)break;}
        if(footprints.length)insert(footprintBins,{points:poly,bounds:bbox,offset,group:overlapGroup});
      }
      binsFor(bbox,k=>{for(const f of groundBins.get(k)||[])candidates.add(f);});
      let pieces=0;
      for(const f of candidates){
        if(f.bounds.minX>bbox.maxX||f.bounds.maxX<bbox.minX||f.bounds.minZ>bbox.maxZ||f.bounds.maxZ<bbox.minZ)continue;
        for(const part of footprints){let clipped=part;const sign=Math.sign(f.area);for(const [a,b] of [[f.a,f.b],[f.b,f.c],[f.c,f.a]]){clipped=clip(clipped,a,b,sign);if(clipped.length<3)break;}
          if(clipped.length>=3){emit(target,clipped,f,offset,c,walkable,depth,overlapGroup,poly);pieces++;}
        }
      }
      // The mathematical islands retain their existing flat zero ground.
      // Never fill a clipped mainland edge with a guessed unrendered terrain.
      if(!pieces&&poly.every(p=>Math.hypot(p.x,p.z)>radius))for(const part of footprints){const a=part[0],b=part[1],c0=part[2],f=face({...a,y:fallback(a.x,a.z)},{...b,y:fallback(b.x,b.z)},{...c0,y:fallback(c0.x,c0.z)});if(f)emit(target,part,f,offset,c,walkable,depth,overlapGroup,poly);}
      target.polygons++;target.walkable=target.walkable||walkable;polygonCount++;return target;
    }
    function addSlab(x,z,w,l,angle,options){const ux=Math.sin(angle),uz=Math.cos(angle),vx=Math.cos(angle),vz=-Math.sin(angle);return addPolygon([[-w/2,-l/2],[-w/2,l/2],[w/2,l/2],[w/2,-l/2]].map(([s,d])=>[x+vx*s+ux*d,z+vz*s+uz*d]),options);}
    function buildMesh(material,name='stone'){
      const layer=layers.get(name);if(!layer||!layer.indices.length)return null;if(layer.mesh)return layer.mesh;
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(layer.positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(layer.colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(layer.uv,2));geo.setIndex(layer.indices);geo.computeVertexNormals();geo.computeBoundingSphere();material.vertexColors=true;
      const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.roadSurface=layer.walkable;mesh.userData.roadLayer=name;layer.mesh=mesh;return mesh;
    }
    function inspect(){return {terrainTriangles:triangles.length,polygons:polygonCount,walkTriangles:walkTriangleCount,layers:[...layers].map(([name,l])=>({name,polygons:l.polygons,topTriangles:l.topTriangles,sideTriangles:l.sideTriangles,vertices:l.positions.length/3,draws:Number(!!l.mesh),walkable:l.walkable}))};}
    return {heightAt,roadHeightAt,addPolygon,addSlab,buildMesh,inspect};
  }
  global.CourtyardRoadSurface=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
