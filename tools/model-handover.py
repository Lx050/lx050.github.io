"""Author three open receiving-to-court relay trusses for B19.
Run: /usr/bin/blender -b -t 4 --python tools/model-handover.py
Real closed Blender solids; two cached material batches; metres.
The reviewed public reading and every original component remain untouched.
"""
import bpy, bmesh, json, pathlib, hashlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/handover';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'cedar':'786b55','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat
parts,contacts,beam_specs,trusses=[],[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def register(obj,name,mat,role,truss,euler=2):
    obj.name=name;obj.data.materials.append(materials[mat]);obj['role']=role;obj['truss']=truss;obj['expected_euler']=euler;parts.append(obj);return obj
def box(name,mat,role,truss,center,size,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=blender(center));obj=bpy.context.object;obj.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Small timber arris','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    return register(obj,name,mat,role,truss)
def beam(name,truss,a,b):
    start,end=blender(a),blender(b);delta=end-start;rotation=delta.to_track_quat('Z','Y');depth=.24 if name.endswith('-lower') else .20
    obj=box(name,'cedar','open transverse relay truss chord',truss,runtime((start+end)/2),[depth,delta.length,.26],.008);obj.rotation_euler=rotation.to_euler()
    beam_specs.append({'id':name,'from':a,'to':b,'length':round(delta.length,6),'localCrossSectionXY':[depth,.26],'localBasisRuntimeXYZ':[runtime(rotation@Vector(v)) for v in [(1,0,0),(0,1,0),(0,0,1)]]})
    return obj
def sleeve(name,truss,x,z,lo,hi):
    vertices=[]
    for y in [lo,hi]:
        for size in [.46,.28]:
            vertices += [tuple(blender((x+sx*size/2,y,z+sz*size/2))) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    faces=[]
    for i in range(4):
        j=(i+1)%4;faces += [(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),(i,i+4,j+4,j),(i+8,j+8,j+12,i+12)]
    mesh=bpy.data.meshes.new(name+'-through-bore');mesh.from_pydata(vertices,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return register(obj,name,'bronze','true hollow roof-seam collar',truss,0)
def contact(component,target,point,purpose):
    contacts.append({'component':component,'target':target,'point':point,'purpose':purpose,'type':'positive-volume intentional joint seat'})
rows=[{'leftZ':-8.82,'rightZ':-8.7,'h':6.72,'apex':9.25},{'leftZ':-4.37,'rightZ':-3.5,'h':6.95,'apex':9.85},{'leftZ':.53,'rightZ':2.1,'h':6.85,'apex':9.55}]
for i,row in enumerate(rows,1):
    z,rz,h,apex=row['leftZ'],row['rightZ'],row['h'],row['apex'];prefix=f'relay-{i:02d}'
    nodes={'L':[-8.65,8.22,z],'S':[-2.35,8.22,z],'A':[-2.35,apex,z],'R':[8.6,8.22,rz]}
    for side in ['L','S','R']:
        x,_,zz=nodes[side];lo=h-.1 if side!='R' else 6.62;hi=8.38;stem=prefix+'-'+side
        box(stem+'-post','cedar','extension seated on actual original frame',i,[x,(lo+hi)/2,zz],[.30,hi-lo,.30],.008)
        bottom,top=(h,h+.5) if side=='L' else ((6.76,h+.93) if side=='S' else (7.30,7.76))
        sleeve(stem+'-roof-collar',i,x,zz,bottom,top)
        contact(stem+'-post','original-frame-post',[x,h+.04 if side!='R' else 6.76,zz],'Original post and lintel have a finite seat into the extension base')
        contact(stem+'-roof-collar',stem+'-post',[x+.145,(bottom+top)/2,zz],'Through-bore wall seats 0.01 m into the timber surface')
    for name,a,b in [('receiving-lower','L','S'),('court-lower','S','R'),('receiving-upper','L','A'),('court-upper','A','R')]:
        beam(prefix+'-'+name,i,nodes[a],nodes[b])
        delta=Vector(nodes[b])-Vector(nodes[a]);unit=delta.normalized()
        for node,point in [(a,Vector(nodes[a])+unit*.04),(b,Vector(nodes[b])-unit*.04)]:
            target=prefix+'-kingpost' if node=='A' else prefix+'-'+node+'-post'
            contact(prefix+'-'+name,target,list(point),'Chord end is positively seated; section remains narrower than its receiving timber')
    box(prefix+'-kingpost','bronze','slender connecting web between the two retained working domains',i,[-2.35,(8.07+apex+.15)/2,z],[.16,apex+.15-8.07,.16])
    contact(prefix+'-kingpost',prefix+'-S-post',[-2.35,8.2,z],'Narrow bronze web enters the central post inside lower chords')
    trusses.append({'index':i,**row,'nodes':nodes,'postUpperY':8.38,'roofSleeves':{'L':[h,h+.5],'S':[6.76,h+.93],'R':[7.3,7.76]}})
bpy.context.view_layer.update()
batches,components,all_points={ },[],[]
for obj in parts:
    obj.data.calc_loop_triangles();mat=obj.data.materials[0].name;positions=batches.setdefault(mat,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[i].co)) for i in tri.vertices]
        assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for vertex in vs:
            p=[round(v,5) for v in vertex];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=abs(bm.calc_volume(signed=True));euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free()
    assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'truss':obj['truss'],'material':mat,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(batches)==2 and triangles==1248
spec={'buildingIndex':19,'units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Three unequal open relay trusses span receiving bays into the common working court. The original low continuous task-light rail retains the longitudinal coordination; the successor station remains empty.','sourceReading':'assets/readings/19.json','trusses':trusses,'beams':beam_specs,'timberBevel':.008,'chordSections':{'inPlaneHeight':.26,'lowerOutOfPlaneDepth':.24,'upperOutOfPlaneDepth':.20},'postSection':[.30,.30],'kingpostSection':[.16,.16],'sleeveOuterSection':[.46,.46],'sleeveInnerSection':[.28,.28],'sleeveTopology':'Watertight genus-one square annular prism; no plug over its through bore','newLongitudinalTies':0,'movingComponentsAdded':0,'materials':['cedar','bronze'],'bounds':{'min':[min(p[i] for p in all_points) for i in range(3)],'max':[max(p[i] for p in all_points) for i in range(3)]},'retention':'Original receiving and shared roofs, frame, screens, service spine and moving task light, all worktables and successor vacancy, reading, original mechanisms and collisions are unchanged. Original finish runs before detail attachment.','limits':'Architectural interpretation and actual joint/contact evidence only; not structural certification. No new roof skin, light, animation, text, screen, progress telemetry, or factual claim.'}
data={'version':1,'source':'Blender closed relay trusses and true hollow roof collars','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-handover.py using Blender; closed relay trusses and true hollow roof collars. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardHandoverDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='handover-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='handover-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Retain floor dimensions, production reading layout and original collision footprints.
  const finish=b.finish;
  b.finish=function(...args){
    const result=finish.apply(b,args);b.root.add(group);b.root.updateMatrixWorld(true);
    const extent=new b.T.Box3().setFromObject(group);
    result.metadata.bounds.union(extent);result.height=Math.max(result.height,extent.max.y);
    return result;
  };
  return group;
}};
})(window);
'''
asset=ROOT/'assets/handover-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'handover-detail.blend'));print('HANDOVER_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
