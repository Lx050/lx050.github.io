"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-editor.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/editor').mkdir(parents=True,exist_ok=True)
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
# Folded northlight roofs: three phases become three evenly lit work zones.
for z in [-6.2,0,6.2]:
 for side in [-1,1]:
  beam('Folded side flashing','copper',(side*9.54,5.98,z-3.10),(side*9.54,8.13,z+3.10),.12,.10,.008)
  for k in range(4):
   x=side*(2.2+k*2.03)
   box('Northlight glazing mullion','steel',(x,6.94,z+3.145),(.075,2.10,.075),.008)
 for k in range(20):
  x=-9.12+k*.96
  beam('Standing roof sheet seam','copper',(x,5.965,z-3.07),(x,8.095,z+3.07),.025,.028,.004)
 for y in [5.91,8.01]:box('Northlight glazing bead','steel',(0,y,z+3.14),(19.0,.075,.075),.009)
 box('Roof valley channel base','copper',(0,5.84,z-3.10),(19.16,.07,.22),.01)
 for zz in [-.105,.105]:box('Roof valley folded upstand','copper',(0,5.91,z-3.10+zz),(19.16,.12,.025),.004)
# Recessed window reveals read as a workshop rather than paper-thin planes.
for z in [-8.8,8.8]:
 for side in [-1,1]:
  x=side*5.25
  box('Window sill coping','limestone',(x,1.16,z),(6.13,.11,.34),.02)
  for xx in [side*2.2,side*8.3]:box('Window deep return','steel',(xx,2.74,z),(.12,3.15,.28),.009)
  box('Window head drip','copper',(x,4.29,z),(6.20,.08,.28),.008)
# Solid aprons and corner connections stay under the existing three editorial tables.
for z in [-5.65,0,5.65]:
 for side in [-1,1]:
  box('Long workbench apron','oak',(-4.9+side*1.98,.80,z),(.10,.16,4.77),.015)
  box('Short workbench apron','cedar',(-4.9,.80,z+side*2.33),(4.04,.16,.10),.015)
  box('Timber table foot stretcher','oak',(-4.9,.28,z+side*2.28),(3.84,.09,.12),.02)
 for x in [-6.80,-3.00]:
  for zz in [z-2.28,z+2.28]:box('Worktable joint shoe','steel',(x,.75,zz),(.17,.21,.17),.012)
# Input: the original stack becomes a supported letter/document rack, no new machine.
for x in [-4.38,-3.12]:
 for z in [-6.94,-5.16]:box('Input rack upright','cedar',(x,1.42,z),(.055,.80,.055),.007)
for y in [1.08,1.86]:
 for z in [-6.94,-5.16]:box('Input rack edge','oak',(-3.75,y,z),(1.34,.055,.055),.007)
# Editing: fine registration ticks occupy the clear edge, outside the six paper samples.
for k in range(29):
 z=-2.12+k*.15
 box('Editing registration tick','bronze',(-6.79,1.022,z),(.18 if k%5==0 else .09,.009,.014),.002)
box('Editing registration straightedge','steel',(-6.91,1.021,0),(.035,.025,4.55),.006)
# Proofing: an A-frame cradle sits behind the tilted sheet and within the old table.
for x in [-6.48,-3.22]:
 beam('Proof stand rear leg','oak',(x,1.03,7.25),(x,3.73,6.62),.10,.12,.015)
 beam('Proof stand front support','cedar',(x,1.03,6.30),(x,3.73,6.62),.09,.10,.012)
box('Proof stand lower shelf','oak',(-4.85,1.00,6.42),(3.58,.09,.38),.02)
box('Proof stand high crosspiece','cedar',(-4.85,3.64,6.64),(3.35,.10,.10),.012)
# Template cabinets: fixed runners and face framing; the original solid box is replaced by an open carcass.
for z in [-6.35,-2.1,2.1,6.35]:
 for side in [-1,1]:
  zz=z+side*1.44
  box('Fixed drawer runner','steel',(6.42,1.31,zz),(3.12,.06,.065),.008)
  box('Cabinet face stile','oak',(4.82,1.05,zz),(.10,1.86,.11),.012)
 for y in [.15,1.97]:box('Cabinet face rail','cedar',(4.82,y,z),(.10,.10,2.98),.012)
 for zz in [z-.9,z+.9]:box('Cabinet assembly key','bronze',(4.75,.32,zz),(.024,.075,.075),.004)
# The second collection is a local-coordinate prototype, attached to each existing moving tray.
static_count=len(parts)
for side in [-1,1]:
 box('Moving tray side','oak',(0,.16,side*1.33),(2.75,.23,.075),.014)
 box('Moving runner tongue','steel',(.08,-.075,side*1.37),(2.53,.055,.045),.007)
box('Moving tray rear','cedar',(1.34,.16,0),(.075,.23,2.70),.014)
box('Moving tray front','oak',(-1.37,.14,0),(.09,.27,2.70),.016)
# A reachable recessed-style pull is physically tied to the drawer, never left floating.
for zz in [-.33,.33]:box('Drawer pull standoff','bronze',(-1.46,.15,zz),(.12,.055,.055),.009)
stroke('Drawer pull grip','bronze',[(-1.52,.15,-.33),(-1.55,.15,-.28),(-1.55,.15,.28),(-1.52,.15,.33)],.025)
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts[:static_count]),('drawer',parts[static_count:])]:
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
data={'version':1,'source':'Blender static assembly and local moving drawer prototype','sections':sections}
js='/* Generated by tools/model-editor.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="editor-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="editor-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardEditorDetail={data,attach(b){return add(b,"static",b.root)},attachDrawer(b,parent){return add(b,"drawer",parent)}};\n})(window);\n'
(ROOT/'assets/editor-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/editor/editor-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/editor/model-report.json').write_text(json.dumps(report,indent=2));print(report)
