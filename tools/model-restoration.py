"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-restoration.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/restoration').mkdir(parents=True,exist_ok=True)
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
# Four protective hoops retain the complete ceramic roof and all four conservation bays.
arch_profiles=[]
def arch(name,mat,z,outer,inner,depth):
 verts=[]
 for i in range(25):
  a=math.pi*i/24
  for rx,ry in [outer,inner]:
   for zz in [-depth/2,depth/2]:verts.append((rx*math.cos(a),-(z+zz),5.25+ry*math.sin(a)))
 faces=[]
 for i in range(24):
  a=i*4;b=(i+1)*4
  faces += [(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,b,b+2,a+2),(a+1,a+3,b+3,b+1)]
 faces += [(0,2,3,1),(96,97,99,98)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);parts.append(o)
for z in [-6.6,-2.2,2.2,6.6]:
 arch('Continuous protective oak arch','oak',z,(8.08,3.95),(7.88,3.75),.34)
 arch_profiles.append({'z':z,'spring':5.25,'outer':[8.08,3.95],'inner':[7.88,3.75],'depth':.34,'segments':24})
 # A restrained narrow bronze line sits on the front cheek of the structural hoop.
 arch('Bronze protective arch face','bronze',z-.182,(8.025,3.895),(7.975,3.845),.026)
 for side in [-1,1]:
  box('External arch upright','oak',(side*7.98,2.695,z),(.20,5.11,.34),.016)
  box('Arch ground shoe','bronze',(side*7.98,.16,z),(.36,.28,.48),.018)
  box('Arch spring clamp','bronze',(side*7.98,5.25,z),(.30,.24,.44),.015)
  a=math.pi/4 if side==1 else 3*math.pi/4
  beam('Vault to protective hoop tie','oak',(7.8*math.cos(a),5.25+2.45*math.sin(a)+.10,z),(7.88*math.cos(a),5.25+3.75*math.sin(a),z),.12,.12,.008)
 # Four hood trims express the four workstations without hiding the complete image.
 for x in [2.795,6.305]:box('Conservation hood side arris','oak',(x,3.7,z),(.06,.17,3.43),.01)
 for zz in [z-1.705,z+1.705]:box('Conservation hood front arris','oak',(4.55,3.7,zz),(3.57,.17,.06),.01)
 # Fixed light suspension collars; all stays above the protected worktop.
 for x in [3.05,6.0]:box('Hood suspension collar','bronze',(x,3.82,z),(.10,.15,.10),.008)
# Four small process-specific instrument trays remain within their original tables.
for z in [-6.6,-2.2,2.2,6.6]:
 box('Conservation shallow instrument tray','oak',(5.73,1.025,z+.98),(.38,.055,.43),.01)
 for x in [5.61,5.72,5.83]:box('Fine tool rest','bronze',(x,1.075,z+.98),(.025,.035,.30),.005)
static_count=len(parts)
# The original inspection light retains its complete 13m side travel.
for z in [-.205,.205]:box('Inspection carriage cheek','oak',(0,0,z),(.51,.14,.035),.006)
box('Inspection carriage top cap','oak',(0,.06,0),(.51,.035,.445),.006)
box('Inspection light suspension eye','bronze',(-.05,.115,0),(.08,.11,.10),.006)
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts[:static_count]),('light',parts[static_count:])]:
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
data={'version':1,'source':'Blender static assembly and local moving light prototype','sections':sections,'archProfiles':arch_profiles}
js='/* Generated by tools/model-restoration.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="restoration-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="restoration-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardRestorationDetail={data,attach(b){const group=add(b,"static",b.root);for(const z of [-6.6,-2.2,2.2,6.6])for(const side of [-1,1]){const x=side*7.98,q=new b.T.Box3(new b.T.Vector3(x-.18,.02,z-.24),new b.T.Vector3(x+.18,5.37,z+.24));q.userData={architectural:true,part:"restoration-protective-arch-foot"};b.collisionBoxes.push(q);}return group},attachLight(b,parent){return add(b,"light",parent)}};\n})(window);\n'
(ROOT/'assets/restoration-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/restoration/restoration-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/restoration/model-report.json').write_text(json.dumps(report,indent=2));print(report)
