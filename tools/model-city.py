"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-city.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/city').mkdir(parents=True,exist_ok=True)
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
# A narrow rain gateway opens into shared work and a sparse, sun-open fan pergola.
def blade(side):
 # Closed tapered stone cheek, anchored above the original rain-wall coping.
 z=-9.55;depth=.56
 profile=[(side*2.52,3.3),(side*2.88,3.3),(side*3.42,8.75),(side*3.18,8.75)]
 verts=[(x,-(z+dz),y) for dz in [-depth/2,depth/2] for x,y in profile]
 faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
 mesh=bpy.data.meshes.new('Rain gate tapered blade');mesh.from_pydata(verts,[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new('Rain gate tapered blade',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials['limestone']);parts.append(o)
for side in [-1,1]:
 blade(side)
 box('Rain wall coping','limestone',(side*2.62,3.34,-6.65),(.27,.08,6.4),.015)
 beam('Stone rainline bronze inlay','bronze',(side*2.72,3.62,-9.84),(side*3.29,8.45,-9.84),.024,.028,.004)
 # Sheltered cedar gallery fascia: no added ground obstruction or roof replacement.
 x,zc,w,d,h=(-7.35,-.4,3.7,10.8,6.55) if side<0 else (7.0,.65,4.15,11.65,7.15)
 for zz in ([zc-d/2,zc+d/2] if side<0 else [zc-d/2]):
  box('Return gallery end fascia','oak',(x,h-.22,zz),(w+.22,.29,.17),.012)
  for dx in [-w/2+.3,w/2-.3]:box('Gallery scarf joint plate','bronze',(x+dx,h-.22,zz-.095),(.22,.20,.025),.006)
 # Shared table apron remains inside its existing solid top and footprint.
 for zz in [-1.32,2.12]:box('Shared worktable end apron','oak',(side*4.35,.91,zz),(2.12,.17,.06),.012)
 for xx in [side*4.35-1.05,side*4.35+1.05]:box('Shared worktable side apron','oak',(xx,.91,.4),(.06,.17,3.4),.012)
# Three gift boxes recall the actual three boxes in the source, without adding fabricated labels.
for x in [-4.8,-4.35,-3.9]:
 box('Return gift box','oak',(x,1.17,1.4),(.32,.14,.28),.018)
 box('Gift box bronze binding','bronze',(x,1.246,1.4),(.035,.014,.30),.003)
# Seven widely separated rays keep the departing terrace genuinely open to the sky.
apex=(0,9.6,6.95);fan_endpoints=[]
for x in [-8.4,-5.6,-2.8,0,2.8,5.6,8.4]:
 end=(x,8.35,9.15);fan_endpoints.append(end)
 beam('Open sunny fan ray','oak',apex,end,.16,.22,.012)
for side in [-1,1]:
 beam('Sun fan front V brace','oak',(side*3.0,7.75,6.95),apex,.24,.28,.016)
 box('V brace original lintel shoe','bronze',(side*3.0,7.67,6.875),(.32,.24,.40),.01)
box('Fan rear collector beam','oak',(0,8.35,9.15),(17.2,.25,.26),.018)
for x in [-8.4,-3.0,3.0,8.4]:
 box('Pergola rear extension stub','oak',(x,7.99,9.15),(.22,.78,.24),.012)
 box('Rear stub joint strap','bronze',(x,7.69,8.995),(.30,.25,.045),.006)
box('Fan apex joint','bronze',apex,(.42,.28,.38),.012)
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
data={'version':1,'source':'Blender static city return gallery assembly','sections':sections,'fanEndpoints':fan_endpoints}
js='/* Generated by tools/model-city.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();g.CourtyardCityDetail={data,attach(b){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="city-blender-static";for(const [material,positions] of Object.entries(data.sections.static.materials)){let geometry=cached[material];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[material]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="city-static-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}b.root.add(group);return group}};\n})(window);\n'
(ROOT/'assets/city-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/city/city-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/city/model-report.json').write_text(json.dumps(report,indent=2));print(report)
