"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-gateway.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/gateway').mkdir(parents=True,exist_ok=True)
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
# Exactly two observed model bays, each with two compatible endpoint routes.
# Neutral raised box-girder paths carry no live availability or performance claim.
def route(side,outer,front,base):
 r=.14; poly=[(2.65,front-r),(outer+r,front-r),(outer+r,-front+r),(2.65,-front+r),(2.65,-front-r),(outer-r,-front-r),(outer-r,front+r),(2.65,front+r)]
 n=len(poly);verts=[(side*x,-z,base+.18*(x-2.65)+dy) for dy in [-.24,.24] for x,z in poly]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new('Continuous paired route wing');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Neutral endpoint route box girder',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials['steel']);bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free();parts.append(o)
for side in [-1,1]:
 route(side,8.65,-7.45,8.45);route(side,8.95,-7.75,8.78)
 for end in [-1,1]:
  z=end*7.6
  for x,bottom,top in [(2.65,7.20,8.615),(8.8,5.70,9.722)]:
   box('Route wing stem on original steel frame','steel',(side*x,(bottom+top)/2,z),(.24,top-bottom,.24),.012)
  beam('Inner paired endpoint bridge','steel',(side*2.65,8.45,end*7.45),(side*2.65,8.78,end*7.75),.25,.25,.01)
  beam('Outer paired endpoint bridge','steel',(side*8.65,9.53,end*7.45),(side*8.95,9.914,end*7.75),.25,.25,.01)
  for x,y,h in [(2.65,7.22,.36),(8.8,5.95,.36)]:box('Roof interface bronze sleeve','bronze',(side*x,y,z),(.39,h,.39),.01)
  # Compact badges are blank mechanical joints, never simulated status lights.
  for x,y in [(2.65,8.615),(8.8,9.722)]:box('Neutral paired-route connector','bronze',(side*x,y,z-.15),(.29,.20,.035),.006)
 # Retain the blank metrics strips and original monitors; protect table corners only.
 for x in [side*5.9-1.55,side*5.9+1.55]:
  for z in [.025,1.075]:box('Observation bench corner shoe','bronze',(x,1.075,z),(.16,.02,.16),.004)
 # Original cabinet carcass and drawers remain behind their existing handle envelope.
 for dx in [-.74,.74]:box('Route archive stile','steel',(side*7.6+dx,.625,3.07),(.08,1.25,.04),.006)
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
data={'version':1,'source':'Blender static paired neutral API route wings','sections':sections}
js='/* Generated by tools/model-gateway.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();g.CourtyardGatewayDetail={data,attach(b){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="gateway-blender-static";for(const [material,positions] of Object.entries(data.sections.static.materials)){let geometry=cached[material];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[material]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="gateway-static-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}const finish=b.finish;b.finish=function(...args){const result=finish.apply(b,args);b.root.add(group);b.root.updateMatrixWorld(true);const extent=new b.T.Box3().setFromObject(group);result.metadata.bounds.union(extent);result.height=Math.max(result.height,extent.max.y);return result;};return group}};\n})(window);\n'
(ROOT/'assets/gateway-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/gateway/gateway-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/gateway/model-report.json').write_text(json.dumps(report,indent=2));print(report)
