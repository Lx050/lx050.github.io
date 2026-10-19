"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-nuanling-app.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/nuanling-app').mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
colors={'oak':'9c8c72','cedar':'786b55','walnut':'453f35','limestone':'c7c3b2','ceramic':'899b96','copper':'728b7d','linen':'b9b4a2','tile':'42574f','clay':'aa6f55','indigo':'425976','moss':'526454','bronze':'84785e'}
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
# Barrel-shaped timber ribs make the long, easy-to-read passage legible.
for z in [-9.24,-7.8,-3.9,0,3.9,7.8,9.24]:
 for k in range(24):
  a=math.pi*k/24;b=math.pi*(k+1)/24
  beam('Vault timber rib','cedar',(7.45*math.cos(a),5.28+1.98*math.sin(a),z),(7.45*math.cos(b),5.28+1.98*math.sin(b),z),.14,.19,.009)
for x in [-6.2,6.2]:
 for z in [-7.8,-3.9,0,3.9,7.8]:
  box('Column stone shoe','limestone',(x,.16,z),(.43,.30,.43),.025)
  box('Column head bearing','oak',(x,5.13,z),(.48,.18,.52))
  box('Vault support extension','oak',(x,5.76,z),(.20,1.12,.23))
  for side in [-1,1]:beam('Vault support knee','cedar',(x,5.25,z+side*.60),(x,5.96,z),.10,.12)
# Four shallow bays have comfortable tactile rims and clear figurative wayfinding.
bays=[(-4.65,-3.9,'clay','see'),(4.65,-3.9,'indigo','hear'),(-4.65,3.9,'moss','speak'),(4.65,3.9,'bronze','talk')]
for x,z,tone,kind in bays:
 for side in [-1,1]:
  box('Canopy longitudinal rim','oak',(x+side*1.60,3.30,z),(.10,.22,4.68))
  box('Canopy transverse rim','cedar',(x,3.30,z+side*2.27),(3.28,.22,.12))
 for k in range(12):box('Absorptive canopy timber slat','oak',(x-1.43+k*.26,3.21,z),(.048,.065,4.35),.007)
 # Rounded bench armrests, kept inside the existing occupied bench footprint.
 for side in [-1,1]:
  xx=x+side*1.13
  stroke('Bench rounded arm grip','oak',[(xx,.60,z+.77),(xx,.78,z+.77),(xx,.81,z+.85),(xx,.81,z+1.22),(xx,.72,z+1.29)],.045)
  box('Bench side cushion piping','linen',(xx,.70,z+1),(.035,.045,.65),.012)
 # Foot-rest and table edging sit inside the protected original desk envelope.
 box('Reachable worktop apron','oak',(x,.66,z-.70),(2.70,.12,1.05),.035)
 box('Low footrest','cedar',(x,.18,z-.59),(1.94,.09,.15),.025)
 # Figure plaque above (not in front of) the existing full-width text plaque.
 zz=z+2.18;yy=3.10
 box('Action bay identity plate '+kind,tone,(x,yy,zz),(.80,.36,.06),.045)
 front=zz-.045
 if kind=='see':
  stroke('Look eye outline','linen',[(x+.27*math.cos(t),yy+.115*math.sin(t),front) for t in [i*2*math.pi/24 for i in range(25)]],.018)
  stroke('Look pupil','linen',[(x+.055*math.cos(t),yy+.055*math.sin(t),front) for t in [i*2*math.pi/16 for i in range(17)]],.016)
 elif kind=='hear':
  for radius in [.09,.16,.23]:stroke('Listen sound arc','linen',[(x-.11+radius*math.cos(t),yy+radius*.59*math.sin(t),front) for t in [-1.1+i*2.2/12 for i in range(13)]],.018)
 elif kind=='speak':
  stroke('Speak microphone capsule','linen',[(x+.055*math.cos(t),yy+.09*math.sin(t)+.02,front) for t in [i*2*math.pi/20 for i in range(21)]],.018)
  stroke('Speak microphone cradle','linen',[(x-.12,yy+.02,front),(x-.10,yy-.08,front),(x,yy-.12,front),(x+.10,yy-.08,front),(x+.12,yy+.02,front)],.018)
  stroke('Speak microphone stand','linen',[(x,yy-.12,front),(x,yy-.16,front)],.018)
 else:
  for dx,dy in [(-.12,.035),(.10,-.025)]:stroke('Talk reciprocal speech','linen',[(x+dx-.11,yy+dy-.06,front),(x+dx-.11,yy+dy+.08,front),(x+dx+.11,yy+dy+.08,front),(x+dx+.11,yy+dy-.06,front),(x+dx+.02,yy+dy-.06,front),(x+dx-.04,yy+dy-.115,front),(x+dx-.04,yy+dy-.06,front),(x+dx-.11,yy+dy-.06,front)],.014)
# Interrupted handrail sleeves and round returns, no new transverse bars in the aisle.
for side in [-1,1]:
 for z,length in [(-6.9,1.35),(0,2),(6.9,1.35)]:
  x=side*2.57
  stroke('Continuous round hand grip','oak',[(x,.84,z-length/2),(x,.96,z-length/2+.09),(x,.985,z-length/2+.18),(x,.985,z+length/2-.18),(x,.96,z+length/2-.09),(x,.84,z+length/2)],.045)
# Connection-state posts get framed, tactile surfaces; no fabricated health/status values.
for x in [-3.25,3.25]:
 for dx in [-.34,.34]:box('Connection post face frame','cedar',(x+dx,1.12,-7.14),(.055,2.10,.07))
 for y in [.10,2.17]:box('Connection post cross frame','oak',(x,y,-7.14),(.70,.065,.07))
 box('Connection post stone foot','limestone',(x,.08,-7),(.89,.15,.32))
# Export evaluated Blender vertices, grouped into just eight opaque draw calls.
bpy.context.view_layer.update()
batches={}
for o in parts:
 o.data.calc_loop_triangles(); key=o.data.materials[0].name; a=batches.setdefault(key,[])
 for tri in o.data.loop_triangles:
  vertices=[]
  for idx in tri.vertices:
   v=o.matrix_world @ o.data.vertices[idx].co;vertices.append(Vector((round(v.x,5),round(v.z,5),round(-v.y,5))))
  if (vertices[1]-vertices[0]).cross(vertices[2]-vertices[0]).length<=1e-9:continue
  for v in vertices:a.extend(round(c,5) for c in v)
data={'version':1,'source':'Blender evaluated beveled mesh','parts':len(parts),'triangles':sum(len(v)//9 for v in batches.values()),'materials':batches}
js='/* Generated by tools/model-nuanling-app.py using Blender; do not hand-edit geometry. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\ng.CourtyardNuanlingAppDetail={data,attach(b){const group=new b.T.Group();group.name="nuanling-app-blender-detail";for(const [material,positions] of Object.entries(data.materials)){const geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="blender-joinery-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}b.root.add(group);return group;}};\n})(window);\n'
(ROOT/'assets/nuanling-app-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/nuanling-app/nuanling-app-detail.blend'))
(ROOT/'qa-results/nuanling-app/model-report.json').write_text(json.dumps({k:v for k,v in data.items() if k!='materials'},indent=2))
print('NUANLING_EXPORTED',len(parts),data['triangles'])
