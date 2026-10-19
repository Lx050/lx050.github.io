"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-nuanling.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/nuanling').mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
colors={'oak':'9c8c72','cedar':'786b55','walnut':'453f35','limestone':'c7c3b2','ceramic':'899b96','copper':'728b7d','linen':'b9b4a2','tile':'42574f'}
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
# Plinth collars and two-stage bracket blocks align to existing eight columns.
for x in [-7.2,7.2]:
 for n in range(4):
  z=-6.4+n*12.8/3
  box('Stone shoe / column foot','limestone',(x,.16,z),(.48,.30,.48),.035)
  box('Timber foot collar','walnut',(x,.36,z),(.34,.09,.34),.012)
  box('Lower bearing block','cedar',(x,4.94,z),(.48,.18,.48))
  box('Transverse bracket arm','oak',(x,5.09,z),(1.18,.16,.34))
  box('Longitudinal bracket arm','cedar',(x,5.23,z),(.34,.16,1.18))
  for s in [-1,1]: box('Bracket bearing cushion','oak',(x+s*.42,5.22,z),(.24,.13,.35))
# Continuous deep fascia, recessed shadow line and regular exposed rafter tails.
for s in [-1,1]:
 box('Eave fascia long','cedar',(s*8.43,5.42,0),(.15,.23,15.25))
 box('Eave shadow bead long','walnut',(s*8.49,5.32,0),(.035,.035,15.25),.004)
 box('Eave fascia end','cedar',(0,5.42,s*7.69),(16.8,.23,.15))
 for k in range(23):
  z=-7.15+k*.65
  box('Exposed rafter tail','oak',(s*7.9,5.31,z),(1.18,.12,.095),.008)
 for k in range(24):
  x=-7.48+k*.65
  box('End eave rafter tail','oak',(x,5.31,s*7.18),(.095,.12,1.15),.008)
# Front and rear garden-facing joinery; 4.2m axial opening is completely clear.
for z in [-6.75,6.75]:
 for s in [-1,1]:
  x=s*4.65
  for xx in [x-2.46,x,x+2.46]: box('Window stile','cedar',(xx,2.19,z),(.12,2.55,.27))
  for y in [.95,1.16,3.24,3.53]: box('Window rail','oak',(x,y,z),(4.98,.12,.27))
  box('Weathered window sill','limestone',(x,.91,z),(5.08,.13,.38))
  for k in range(11): box('Window lattice vertical','cedar',(x-2.25+k*.45,2.19,z),(.038,1.98,.08),.004)
  for y in [1.58,2.19,2.8]: box('Window lattice horizontal','cedar',(x,y,z),(4.8,.038,.08),.004)
  for k in range(5):
   xx=x-1.8+k*.9
   for y in [1.58,2.8]:
    for dx in [-.12,.12]: box('Lattice returning corner','oak',(xx+dx,y+.12,z),(.025,.24,.09),.003)
    box('Lattice returning crown','oak',(xx,y+.24,z),(.26,.025,.09),.003)
  box('Panel foot rail','cedar',(x,.16,z),(5.02,.14,.25))
  for k in range(5): box('Lower wall panel rhythm','oak',(x-2+k, .51,z),(.04,.55,.23),.004)
# Raised beam panel and small peg joinery, leaving existing plaque sightline intact.
for z in [-6.4,6.4]:
 box('Head beam recessed panel','walnut',(0,5.04,z),(13.6,.20,.30))
 for x in [-6.9,-4.6,-2.3,2.3,4.6,6.9]: box('Visible joinery peg','oak',(x,5.04,z-.17),(.045,.045,.04),.005)
# Bench cushion seams and worktop edge rails remain inside existing side bays.
for s in [-1,1]:
 for z in [-.1,.6,1.3,2,2.7]: box('Upholstery seam','cedar',(s*6.295,1,z),(.018,.84,.018),.003)
 for z in [-3.7,4.5]: box('Alcove canopy edging','oak',(s*4.9,3.72,z),(4.05,.16,.10))
# Quiet overlapping tile courses and narrow pan seams follow the preserved roof planes.
for side in [-1,1]:
 for k in range(1,23):
  t=k/23; y=5.52+2.22*t+.025
  box('Roof tile course front-back','tile',(0,y,side*(7.9-6.162*t)),(17.3*(1-.77*t)-.12,.025,.045),0)
  box('Roof tile course side','tile',(side*(8.65-6.6605*t),y,0),(.045,.025,15.8*(1-.78*t)-.12),0)
 for k in range(1,24):
  u=k/24
  for a,b in [((-8.65+17.3*u,5.55,side*7.88),(-1.9895+3.979*u,7.77,side*1.738)),((side*8.63,5.55,-7.9+15.8*u),(side*1.9895,7.77,-1.738+3.476*u))]:
   start=Vector((a[0],-a[2],a[1]));end=Vector((b[0],-b[2],b[1]));mid=(start+end)/2
   o=box('Roof pan seam','tile',(mid.x,mid.z,-mid.y),(.024,(end-start).length,.024),0)
   o.rotation_euler=(end-start).to_track_quat('Z','Y').to_euler()
# Export evaluated Blender vertices, grouped into just eight opaque draw calls.
bpy.context.view_layer.update()
batches={}
for o in parts:
 o.data.calc_loop_triangles(); key=o.data.materials[0].name; a=batches.setdefault(key,[])
 for tri in o.data.loop_triangles:
  for idx in tri.vertices:
   v=o.matrix_world @ o.data.vertices[idx].co; a.extend([round(v.x,5),round(v.z,5),round(-v.y,5)])
data={'version':1,'source':'Blender evaluated beveled mesh','parts':len(parts),'triangles':sum(len(v)//9 for v in batches.values()),'materials':batches}
js='/* Generated by tools/model-nuanling.py using Blender; do not hand-edit geometry. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\ng.CourtyardNuanlingDetail={data,attach(b){const group=new b.T.Group();group.name="nuanling-blender-joinery";for(const [material,positions] of Object.entries(data.materials)){const geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="blender-joinery-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}b.root.add(group);return group;}};\n})(window);\n'
(ROOT/'assets/nuanling-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/nuanling/nuanling-joinery.blend'))
(ROOT/'qa-results/nuanling/model-report.json').write_text(json.dumps({k:v for k,v in data.items() if k!='materials'},indent=2))
print('NUANLING_EXPORTED',len(parts),data['triangles'])
