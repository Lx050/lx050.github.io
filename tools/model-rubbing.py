"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-editor.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/rubbing').mkdir(parents=True,exist_ok=True)
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
# Four separated folded wings: an architectural interpretation of four evidence thresholds.
# All roof shells are closed 16 cm solids; the original evidence and proposal edges are untouched.
def shell(name, mat, x1,y1,x2,y2,z,d):
 coords=[(x1,y1,z-d/2),(x2,y2,z-d/2),(x2,y2,z+d/2),(x1,y1,z+d/2)]
 verts=[(x,-zz,y-dy) for dy in [0,.16] for x,y,zz in coords]
 faces=[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);parts.append(o)
for n,(z,h) in enumerate([(-7.3,7.05),(-2.6,8.30),(2.15,7.40),(6.85,8.70)]):
 for side in [-1,1]:
  # Fold at the outside bay; upturned edges express separated layers, not random spikes.
  profile=[(side*.85,h+1.35),(side*7.0,h+.60),(side*9.5,h+2.00)]
  for j in range(2):
   x1,y1=profile[j];x2,y2=profile[j+1]
   shell('Closed folded roof leaf','tile' if n%2==0 else 'copper',x1,y1,x2,y2,z,3.6)
   for zz in [z-1.81,z+1.81]:
    beam('Deep folded cedar fascia','cedar',(x1,y1-.14,zz),(x2,y2-.14,zz),.16,.16,.012)
    beam('Folded bronze drip edge','bronze',(x1,y1+.025,zz),(x2,y2+.025,zz),.045,.055,.007)
   for k in range(1,8 if j==0 else 4):
    f=k/(8 if j==0 else 4);x=x1+(x2-x1)*f;y=y1+(y2-y1)*f
    box('Roof standing seam','copper',(x,y+.025,z),(.025,.045,3.53),.004)
  for zz in [z-1.62,z+1.62]:
   # Two compression branches meet the existing post, with a low beam that stays legible below.
   beam('Outer fork roof strut','oak',(side*8.5,h,zz),(side*9.35,h+1.78,zz),.20,.20,.016)
   beam('Inner fork roof strut','oak',(side*8.5,h,zz),(side*6.9,h+.40,zz),.20,.20,.016)
   beam('Light slot support','oak',(side*2.05,h+.14,zz),(side*.92,h+1.16,zz),.16,.16,.014)
   box('Portal head saddle','bronze',(side*8.5,h+.02,zz),(.36,.32,.33),.014)
   box('Post stone shoe','limestone',(side*8.5,.16,zz),(.48,.32,.48),.025)
  box('Fold valley channel','steel',(side*7,h+.62,z),(.10,.08,3.64),.009)
  box('Central glass bead','bronze',(side*.77,h+1.37,z),(.07,.12,3.62),.01)
 for zz in [z-1.74,z+1.74]:box('Skylight end bead','bronze',(0,h+1.37,zz),(1.57,.10,.07),.008)
# Protective glass is held away from the immutable blank original.
for x in [-7.28,-3.62]:
 box('Datum glazing upright','bronze',(x,2.30,-7.79),(.055,3.48,.065),.009)
 box('Datum glazing foot','steel',(x,.62,-7.76),(.13,.18,.19),.012)
for y in [.57,4.03]:box('Datum glazing rail','bronze',(-5.45,y,-7.79),(3.70,.055,.065),.009)
# Eleven equivalent carriers: identical frames and slanted supports, no fabricated writing.
for side in [-1,1]:
 count=6 if side<0 else 5
 for n in range(count):
  x=side*5.3+(n-(count-1)/2)*.77
  for xx in [x-.325,x+.325]:box('Reference carrier side','oak',(xx,1.7,-2.34),(.032,1.17,.09),.005)
  for y in [1.12,2.28]:box('Reference carrier rail','oak',(x,y,-2.34),(.68,.032,.09),.005)
  beam('Reference easel brace','steel',(x,1.12,-2.10),(x,2.04,-2.32),.035,.04,.005)
# Table joinery stays wholly inside the original workbench footprint.
for x,z,w,d,y in [(5.4,-7.15,3.7,1.7,1.02),(5.3,2.15,3.8,1.8,1.03)]:
 for side in [-1,1]:
  box('Source desk apron','cedar',(x,y-.19,z+side*(d/2-.09)),(w-.12,.19,.09),.014)
  box('Source desk end rail','oak',(x+side*(w/2-.09),y-.19,z),(.09,.19,d-.12),.014)
# A precise reversible rail mechanism, contained within the existing sweep guard.
for x in [-7.8,-3.1]:
 box('Fixed rail end stop','bronze',(x,3.55,1.81),(.08,.18,.19),.008)
box('Fixed overlay lower guide','steel',(-5.45,.65,1.81),(4.8,.035,.12),.006)
# Unresolved recess retains its central missing lintel. End caps accentuate, never bridge, the gap.
for x in [5.62,6.815]:box('Unresolved lintel termination','bronze',(x,3.3,9.05),(.045,.17,.19),.007)
static_count=len(parts)
# Local prototype fixed to the original glass pivot; movement remains the existing .96m translation.
for x in [-1.60,1.60]:
 for y in [-1.34,1.34]:box('Moving overlay corner shoe','bronze',(x,y,0),(.13,.12,.10),.01)
for x in [-1.5,1.5]:
 box('Moving overlay guide block','steel',(x,1.38,0),(.18,.035,.09),.006)
# Flush grip, inside both the old physical sweep and the plinth footprint.
box('Moving comparison grip','bronze',(1.59,-.20,-.035),(.09,.38,.035),.009)
# Validate every folded leaf as a closed positive-volume shell before exporting.
roof_shells=[o for o in parts if o.name.startswith('Closed folded roof leaf')]
assert len(roof_shells)==16
for o in roof_shells:
 bm=bmesh.new();bm.from_mesh(o.data)
 assert all(e.is_manifold for e in bm.edges), o.name
 assert bm.calc_volume(signed=True)>0, o.name
 bm.free()
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts[:static_count]),('overlay',parts[static_count:])]:
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
data={'version':1,'source':'Blender static assembly and local moving overlay prototype','sections':sections}
js='/* Generated by tools/model-rubbing.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="rubbing-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="rubbing-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardRubbingDetail={data,attach(b){return add(b,"static",b.root)},attachOverlay(b,parent){return add(b,"overlay",parent)}};\n})(window);\n'
(ROOT/'assets/rubbing-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/rubbing/rubbing-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/rubbing/model-report.json').write_text(json.dumps(report,indent=2));print(report)
