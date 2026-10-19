"""Closed Blender-authored joinery for the actual B2 secondary Huayun entrance.
Run /usr/bin/blender -b -t 4 --python tools/model-alternate.py
All original construction, content and motion stay intact. Metres, no added roof skin.
"""
import bpy, bmesh, json, pathlib, hashlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/alternate';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'oak':'9c8c72','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat
parts,contacts,boxes,sleeves,profiles=[],[],[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def register(obj,name,mat,role,zone,euler=2):
    obj.name=name;obj.data.materials.append(materials[mat]);obj['role']=role;obj['zone']=zone;obj['expected_euler']=euler;parts.append(obj);return obj
def box(name,role,zone,center,size):
    bpy.ops.mesh.primitive_cube_add(size=1,location=blender(center));obj=bpy.context.object;obj.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=obj.modifiers.new('Timber softened arris','BEVEL');mod.width=.008;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    boxes.append({'id':name,'center':center,'size':size,'bevel':.008});return register(obj,name,'oak',role,zone)
def mesh(name,vertices,faces,mat,role,zone,euler=2):
    data=bpy.data.meshes.new(name+'-closed-mesh');data.from_pydata([tuple(blender(v)) for v in vertices],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return register(obj,name,mat,role,zone,euler)
def sleeve(name,zone,x,y,z):
    vertices=[]
    for yy in [y-.06,y+.06]:
        for size in [.26,.16]:
            vertices += [(x+sx*size/2,yy,z+sz*size/2) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    faces=[]
    for i in range(4):
        j=(i+1)%4;faces += [(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),(i,i+4,j+4,j),(i+8,j+8,j+12,i+12)]
    sleeves.append({'id':name,'center':[x,y,z],'height':.12,'outer':.26,'inner':.16})
    return mesh(name,vertices,faces,'bronze','true through-bored post saddle; 10mm radial timber seat',zone,0)
# A continuous planar curved timber, not an open strip or isolated upturned hook.
# The end has a relaxed scroll-like rise, with an uninterrupted solid back to the post.
path=[(.06,3.69),(-.06,3.75),(-.18,3.81),(-.31,3.87),(-.44,3.91),(-.57,3.92),(-.67,3.96),(-.74,4.02),(-.77,4.10)]
def bracket(name,zone,x,z):
    profile=[];lower=[];upper=[]
    for i,(zz,y) in enumerate(path):
        a=Vector(path[max(0,i-1)]);b=Vector(path[min(len(path)-1,i+1)]);t=(b-a).normalized();n=Vector((-t.y,t.x));half=.075
        lower.append((zz-n.x*half,y-n.y*half));upper.append((zz+n.x*half,y+n.y*half))
    profile=lower+upper[::-1];n=len(profile)
    vertices=[(xx,y,z+zz) for xx in [x-.12,x+.12] for zz,y in profile]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    profiles.append({'id':name,'centerX':x,'portalZ':z,'pathZY':path,'width':.24,'normalThickness':.15})
    return mesh(name,vertices,faces,'oak','closed continuous scroll-profile corbel from original portal post to stepped lintel',zone)
def contact(a,b,p,purpose):contacts.append({'component':a,'target':b,'point':p,'purpose':purpose,'type':'positive-volume intentional seat'})
for zone,z in [('outer-threshold',-5.35),('inner-threshold',3.45)]:
    for tier,(y,dz,size) in enumerate([(3.91,-.08,[5.24,.20,.44]),(3.99,-.35,[5.48,.16,.32]),(4.07,-.55,[5.72,.12,.20])],1):
        box(f'{zone}-lintel-{tier}','layered scroll-like eave header with finite overlap and separate visible arris',zone,[0,y,z+dz],size)
    contact(f'{zone}-lintel-1','original-portal-header',[0,3.90,z-.06],'160mm vertical and 220mm depth seat within original oak lintel')
    contact(f'{zone}-lintel-2',f'{zone}-lintel-1',[0,3.96,z-.25],'100mm vertical lap with 110mm depth overlap')
    contact(f'{zone}-lintel-3',f'{zone}-lintel-2',[0,4.045,z-.48],'60mm vertical and 60mm depth overlap')
    if z<0:contact(f'{zone}-lintel-1','original-clay-transom',[0,3.98,z-.06],'Retained clay band overlaps55mm vertically; oak front face advances150mm and is not coplanar')
    for side,x in [('left',-2.425),('right',2.425)]:
        name=f'{zone}-{side}';bracket(name+'-scroll-corbel',zone,x,z);sleeve(name+'-post-saddle',zone,x,3.69,z)
        box(name+'-post-shoulder','seated shoulder joining original post to full scroll-profile timber',zone,[x,3.77,z+.01],[.28,.18,.30])
        contact(name+'-scroll-corbel','original-portal-post',[x,3.72,z+.025],'Continuous150mm-thick curved timber positively seats into retained180mm post')
        contact(name+'-post-saddle','original-portal-post',[x+.085,3.67,z],'True160mm through-bore has10mm radial timber seat')
        contact(name+'-post-shoulder','original-portal-post',[x,3.76,z],'Shoulder directly seats in original continuous post')
        contact(name+'-post-shoulder',name+'-scroll-corbel',[x,3.76,z-.08],'Independent shoulder and continuous curved corbel share finite volume')
        contact(name+'-scroll-corbel',f'{zone}-lintel-1',[x,3.84,z-.22],'Curved timber supports the lower eave layer')
        contact(name+'-scroll-corbel',f'{zone}-lintel-3',[x,4.021,z-.641],'Upper curving timber seats into third eave layer before its upturned tip')
# Modest long side returns finish the original frame above its uninterrupted glass/paper.
# They directly seat on retained longitudinal oak; they do not add canopy skins.
for side,s in [('west',-1),('east',1)]:
    rail=side+'-eave-seat';lip=side+'-eave-lip'
    box(rail,'continuous high side-eave reveal seated in the retained oak frame','side-eaves',[s*5.53,5.12,0],[.30,.18,11.18])
    box(lip,'lower outward eave arris, leaving an expressed stepped edge','side-eaves',[s*5.67,5.04,0],[.17,.14,11.02])
    contact(rail,'original-longitudinal-frame',[s*5.45,5.12,0],'Original280mm-wide longitudinal beam retains160mm interior overlap')
    contact(lip,rail,[s*5.63,5.065,0],'Separate lower eave step connects by95mm horizontal and80mm vertical overlap')

bpy.context.view_layer.update();batches={};components=[];all_points=[]
for obj in parts:
    obj.data.calc_loop_triangles();material=obj.data.materials[0].name;positions=batches.setdefault(material,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[j].co)) for j in tri.vertices];assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for v in vs:p=[round(x,5) for x in v];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free();assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[j] for p in points) for j in range(3)],'max':[max(p[j] for p in points) for j in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'zone':obj['zone'],'material':material,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(parts)==22 and len(batches)==2 and triangles==1016
spec={'buildingIndex':2,'productionBuilder':'assets/content-creation-care.js','units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Two modest live thresholds into the same Huayun program: continuous scroll-profile corbels support layered lintels and lightly returned original side eaves. The shared long scroll, five medium samples and nine translating light filters remain unaltered.','sourceReading':'assets/readings/2.json','sourceReadingSHA256':hashlib.sha256((ROOT/'assets/readings/2.json').read_bytes()).hexdigest(),'boxes':boxes,'postSaddles':sleeves,'corbelProfiles':profiles,'newRoofSkins':0,'roofPenetrations':0,'movingComponentsAdded':0,'materials':['oak','bronze'],'bounds':{'min':[min(p[j] for p in all_points) for j in range(3)],'max':[max(p[j] for p in all_points) for j in range(3)]},'retention':'Every original mesh, material, transform, motion, physical/reading collider, title, URL and source text is unchanged. Original finish runs before the additive attachment so dimensions and reading placement remain unchanged; actual culling bounds are unioned.','limits':'Architectural interpretation and mesh/contact evidence only; not structural certification. No new text, imagery, source link, roof skin, motion or lighting.'}
data={'version':1,'source':'Blender closed scroll-profile corbels, layered entry eaves and true hollow bronze saddles','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-alternate.py using Blender; closed double-threshold joinery. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardAlternateDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='alternate-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='alternate-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Preserve original dimensions, sign suspension and reading placement before updating actual bounds.
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
asset=ROOT/'assets/alternate-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'alternate-detail.blend'));print('ALTERNATE_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
