"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-proof.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/proof').mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
colors={'oak':'9c8c72','cedar':'786b55','walnut':'453f35','limestone':'c7c3b2','ceramic':'899b96','copper':'728b7d','linen':'b9b4a2','tile':'42574f','clay':'aa6f55','indigo':'425976','moss':'526454','bronze':'84785e','steel':'303e42','paper':'e0d5b4'}
materials={}
for key,h in colors.items():
 m=bpy.data.materials.new(key); m.diffuse_color=(*[int(h[i:i+2],16)/255 for i in (0,2,4)],1); materials[key]=m
parts=[]
def box(name,mat,p,size,bevel=.018):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1])); o=bpy.context.object; o.name=name
 o.scale=(size[0],size[2],size[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(materials[mat]);
 if bevel:
  mod=o.modifiers.new('Hand-softened arris','BEVEL'); mod.width=bevel; mod.segments=1
  bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
 parts.append(o); return o
def beam(name,mat,a,b,width=.10,depth=.10,bevel=.012):
 start=Vector((a[0],-a[2],a[1]));end=Vector((b[0],-b[2],b[1]));mid=(start+end)/2
 o=box(name,mat,(mid.x,mid.z,-mid.y),(width,(end-start).length,depth),bevel)
 o.rotation_euler=(end-start).to_track_quat('Z','Y').to_euler();return o

def stroke(name,mat,points,radius=.025):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=radius;curve.bevel_resolution=1;curve.resolution_u=1
 closed=(Vector(points[0])-Vector(points[-1])).length<1e-6
 if closed:points=points[:-1]
 curve.use_fill_caps=True
 spline=curve.splines.new('POLY');spline.use_cyclic_u=closed;spline.points.add(len(points)-1)
 for p,co in zip(spline.points,points):p.co=(co[0],-co[2],co[1],1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);bpy.context.view_layer.objects.active=o;o.select_set(True)
 for other in bpy.context.selected_objects:
  if other!=o:other.select_set(False)
 bpy.ops.object.convert(target='MESH');parts.append(o);return o
# Eight equal proof stages retain the first misregistration and the quiet rear margin.
profile=[(5.4,7.54),(6.0,7.54),(6.85,8.46),(8.0,8.92),(8.0,9.08),(6.76,8.60),(5.95,7.74),(5.4,7.74)]
def fold(side,z,offset):
 n=len(profile);verts=[(offset+side*x,-(z+dz),y) for dz in [-.64,.64] for x,y in profile]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new('Continuous folded proof eave');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Eight-stage upturned proof margin',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials['oak']);bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free();parts.append(o)
for n,z in enumerate([-8.35,-6.42,-4.48,-2.54,-.6,1.34,3.28,5.22]):
 offset=-.38 if n==0 else 0
 for side in [-1,1]:
  fold(side,z,offset)
  box('Fold support above original frame post','oak',(offset+side*7.6,8.15,z),(.16,1.22,.18),.008)
  beam('Folded proof bracket','oak',(offset+side*6.3,7.57,z),(offset+side*7.4,8.70,z),.10,.12,.008)
  box('Retained first-offset edge' if n==0 else 'Proof edge binding','clay' if n==0 else 'bronze',(offset+side*8.0,9.0,z),(.055,.16,1.32),.006)
# Each paired table retains its four original paper fields and alternating task slips.
for side in [-1,1]:
 for n in range(4):
  z=-3.72+n*1.45
  box('Proof bench edge clamp','bronze',(side*6.72,1.127,z),(.15,.024,.20),.004)
 # Slim bench-end caps stay within the pre-existing sitting surface footprint.
 for x in [side*5.1-1.35,side*5.1+1.35]:box('Shared bench end cap','bronze',(x,.617,-5.65),(.12,.024,.62),.004)
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts)]:
 batches={}
 for o in objects:
  o['runtime_section']=section;o.data.calc_loop_triangles();key=o.data.materials[0].name;a=batches.setdefault(key,[])
  for tri in o.data.loop_triangles:
   vertices=[]
   for idx in tri.vertices:
    v=o.matrix_world @ o.data.vertices[idx].co;vertices.append(Vector((round(v.x,5),round(v.z,5),round(-v.y,5))))
   if (vertices[1]-vertices[0]).cross(vertices[2]-vertices[0]).length<=1e-9:continue
   for v in vertices:a.extend(round(c,5) for c in v)
 sections[section]={'parts':len(objects),'triangles':sum(len(v)//9 for v in batches.values()),'materials':batches}
data={'version':1,'source':'Blender static eight retained proof margins','sections':sections}
js='/* Generated by tools/model-proof.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();g.CourtyardProofDetail={data,attach(b){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="proof-blender-static";for(const [material,positions] of Object.entries(data.sections.static.materials)){let geometry=cached[material];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[material]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="proof-static-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}const finish=b.finish;b.finish=function(...args){const result=finish.apply(b,args);b.root.add(group);b.root.updateMatrixWorld(true);const extent=new b.T.Box3().setFromObject(group);result.metadata.bounds.union(extent);result.height=Math.max(result.height,extent.max.y);return result;};return group}};\n})(window);\n'
(ROOT/'assets/proof-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/proof/proof-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/proof/model-report.json').write_text(json.dumps(report,indent=2));print(report)
