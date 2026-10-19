"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-huayun.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/huayun').mkdir(parents=True,exist_ok=True)
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
# A continuous unfurled scroll above the quiet conservation range.
# Its five-material display route and original comparison layers stay below, unchanged.
def height(z):return 7.8+2.5*(abs(z)/10.2)**4
zs=[-10.2+20.4*i/40 for i in range(41)]
profile=[(z,height(z)) for z in zs]+[(z,height(z)-.14) for z in reversed(zs)]
def ribbon(name,mat,x0,x1,lift=0):
 n=len(profile);verts=[(x,-z,y+lift) for x in [x0,x1] for z,y in profile]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free();parts.append(o)
ribbon('Unfurled long-scroll timber canopy','oak',5.0,9.2)
for x in [4.97,9.15]:ribbon('Scroll bronze bound edge','bronze',x,x+.08,.018)
for z in [-8.3,-4.98,-1.66,1.66,4.98,8.3]:
 i=min(39,max(0,int((z+10.2)/.51)));f=(z-zs[i])/(zs[i+1]-zs[i]);top=height(zs[i])*(1-f)+height(zs[i+1])*f-.14
 for x in [5.2,8.6]:
  box('Scroll canopy support on original frame','oak',(x,(6.22+top)/2,z),(.16,top-6.22,.18),.008)
 box('Scroll canopy cross bearer','oak',(7.1,top-.085,z),(4.2,.17,.20),.01)
 for x,end in [(5.2,6.15),(8.6,7.65)]:beam('Scroll canopy bracket','oak',(x,top-(.60 if x>8 else .85),z),(end,top-.10,z),.10,.12,.008)
 # Roof penetration only occurs at the east support; a bronze sleeve follows it.
 box('East roof support collar','bronze',(8.6,6.90,z),(.30,.34,.34),.008)
# Five plinth edges retain the real medium-specific original exhibits.
# Calligraphy receives paired scroll-axis tabs, mural a broad tray, painting a thin frame,
# bronze a four-corner mount, and cut-paper a two-diagonal corner motif.
for j,z in enumerate([-6.6,-3.3,0,3.3,6.6]):
 if j==0:
  for x in [-7.65,-4.85]:box('Calligraphy axis tab','bronze',(x,.292,z-1.15),(.16,.024,.28),.004)
 elif j==1:box('Mural fragment tray lip','bronze',(-6.25,.30,z-1.20),(3.22,.04,.08),.005)
 elif j==2:
  for x in [-7.77,-4.73]:box('Painting mount side','bronze',(x,.292,z),(.045,.024,2.45),.004)
  for zz in [z-1.225,z+1.225]:box('Painting mount end','bronze',(-6.25,.292,zz),(2.995,.024,.045),.004)
 elif j==3:
  for x in [-7.65,-4.85]:
   for zz in [z-1.1,z+1.1]:box('Bronze exhibit plinth corner','bronze',(x,.30,zz),(.20,.04,.20),.005)
 else:
  for x,end in [(-7.65,-7.35),(-4.85,-5.15)]:beam('Cut-paper diagonal mount','bronze',(x,.30,z-1.1),(end,.30,z-.8),.035,.035,.004)
# Table clips remain outside the full original paper field, within the old table footprint.
for x in [3.16,7.04]:
 for z in [-3.17,1.87]:box('Conservation table corner protector','bronze',(x,1.065,z),(.22,.02,.22),.004)
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
data={'version':1,'source':'Blender static unfurled scroll conservation canopy','sections':sections,'scrollProfile':profile}
js='/* Generated by tools/model-huayun.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();g.CourtyardHuayunDetail={data,attach(b){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="huayun-blender-static";for(const [material,positions] of Object.entries(data.sections.static.materials)){let geometry=cached[material];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[material]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="huayun-static-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}const finish=b.finish;b.finish=function(...args){const result=finish.apply(b,args);b.root.add(group);b.root.updateMatrixWorld(true);const extent=new b.T.Box3().setFromObject(group);result.metadata.bounds.union(extent);result.height=Math.max(result.height,extent.max.y);return result;};return group}};\n})(window);\n'
(ROOT/'assets/huayun-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/huayun/huayun-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/huayun/model-report.json').write_text(json.dumps(report,indent=2));print(report)
