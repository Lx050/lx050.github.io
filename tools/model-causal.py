"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-causal.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/causal').mkdir(parents=True,exist_ok=True)
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
# Seven life-lines retain the exact original plan and the three real sky gaps.
# A restrained alternating wave gives the lines a shared rhythm rather than random spikes.
def strip(name,mat,centers,width,thickness,ux,uz):
 verts=[]
 for dy in [0,thickness]:
  for x,y,z in centers:
   for side in [-1,1]:verts.append((x+side*width/2*ux,y-dy,z+side*width/2*uz))
 L=2*len(centers);faces=[]
 for k in range(len(centers)-1):
  i=k*2;j=i+2
  faces.extend([(i,i+1,j+1,j),(L+i,L+j,L+j+1,L+i+1),(i,j,L+j,L+i),(i+1,L+i+1,L+j+1,j+1)])
 faces.extend([(0,L,L+1,1),(L-2,L-1,2*L-1,2*L-2)])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(x,-z,y) for x,y,z in verts],[],faces);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));assert all(e.is_manifold for e in bm.edges);assert bm.calc_volume(signed=True)>0;bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);parts.append(o);return o
xs=[-8.5,-5.65,-2.9,0,2.9,5.65,8.5];hs=[6.7,7.45,6.3,8.3,6.9,7.65,6.5]
roofs=['tile','copper','ceramic','tile','copper','ceramic','tile'];roof_info=[]
def height(n,z):return hs[n]+.20+1.65*(.5+.5*math.cos(math.pi*z/6+(n%2)*math.pi))
for n,x in enumerate(xs):
 end=6.05 if n==6 else 9.8
 points=[(-9.8,0),(-6,((n%3)-1)*.42),(0,((n+1)%3-1)*.48),(6,((n+2)%3-1)*.35),(end,0)]
 if n==6:points=points[:4]
 for q in range(1,len(points)):
  a,c=points[q-1],points[q];dx=c[1]-a[1];dz=c[0]-a[0];length=math.hypot(dx,dz);ux=dz/length;uz=-dx/length;width=1.9 if n==3 else 2.13
  centers=[]
  for k in range(13):
   f=(.98+(length-1.96)*k/12)/length;px=x+a[1]+dx*f;pz=a[0]+dz*f;centers.append((px,height(n,pz),pz))
  strip('Closed life-line roof %d segment %d'%(n,q),roofs[n],centers,width,.16,ux,uz)
  roof_info.append({'line':n,'segment':q,'width':width,'thickness':.16,'centers':[[round(v,5) for v in p] for p in centers],'crossAxis':[ux,uz]})
  for side in [-1,1]:
   # Continuous timber edge lamination, in actual contact with the underside.
   edge=[(px+side*(width/2-.055)*ux,y-.16,pz+side*(width/2-.055)*uz) for px,y,pz in centers]
   strip('Curved edge lamination','cedar',edge,.11,.14,ux,uz)
   # Two tied web members take each raised ribbon down to its preserved structural edge.
   for k in [0,12]:
    px,y,pz=centers[k]
    beam('Roof web to retained edge','oak',(px+side*1.05,hs[n]-.18,pz),(px+side*(width/2-.055)*ux,y-.28,pz+side*(width/2-.055)*uz),.085,.085,.008)
  for k in [0,6,12]:
   px,y,pz=centers[k]
   beam('Roof transverse folded seam','bronze',(px-width/2*ux,y+.025,pz-width/2*uz),(px+width/2*ux,y+.025,pz+width/2*uz),.028,.03,0)
# Three cross-courts remain open. Their lower shared roofs receive connected edge details.
for k,z in enumerate([-6,0,6]):
 for side in [-1,1]:
  y=5.45+k*.28;courtZ=z-.95
  for xx in [side*2.72,side*9.15]:
   beam('Court canopy cantilever tie','cedar',(xx,5.3+k*.28,z),(xx,5.3+k*.28,courtZ),.14,.18,.012)
  for zz in [courtZ-.89,courtZ+.89]:box('Court canopy laminated edge','cedar',(side*5.75,y-.04,zz),(7.0,.19,.075),.012)
  # Two short journals meet the preserved rotating light-catcher centerline.
  for dz in [-.765,.765]:
   box('Light catcher fixed bearing','bronze',(side*5.8,5.84+k*.28,courtZ+dz),(.16,.18,.09),.012)
   box('Light catcher bearing pedestal','bronze',(side*5.8,5.6775+k*.28,courtZ+dz),(.14,.325,.14),.01)
  # Display table aprons remain completely inside each original small table footprint.
  for zz in [z-.72,z+.48]:box('Cross-court table apron','oak',(side*8.65,.63,zz),(1.13,.18,.08),.01)
# The seventh line's real end remains exactly where it was, with a physical cap, never an extension.
box('Terminated branch coping','bronze',(8.5,1.165,6.25),(1.65,.05,.22),.008)
static_count=len(parts)
# Local light-catcher frame follows each original rigid pivot. No new animation is added.
for x in [-1.12,1.12]:box('Moving light catcher side','oak',(x,0,0),(.065,.10,1.31),.009)
for z in [-.64,.64]:box('Moving light catcher rim','oak',(0,0,z),(2.30,.10,.06),.009)
for z in [-.705,.705]:box('Moving light catcher journal','bronze',(0,0,z),(.09,.09,.12),.008)
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts[:static_count]),('vent',parts[static_count:])]:
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
data={'version':1,'source':'Blender static assembly and local moving vent prototype','sections':sections,'roofProfiles':roof_info}
js='/* Generated by tools/model-causal.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="causal-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="causal-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardCausalDetail={data,attach(b){return add(b,"static",b.root)},attachVent(b,parent){return add(b,"vent",parent)}};\n})(window);\n'
(ROOT/'assets/causal-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/causal/causal-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/causal/model-report.json').write_text(json.dumps(report,indent=2));print(report)
