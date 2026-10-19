"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-ink.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/ink').mkdir(parents=True,exist_ok=True)
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
# Six rising paper-wing screens distinguish whole image, annotation grid and archive density.
# All original roofs and work surfaces remain intact; these frames grow from side columns.
wing_profiles=[]
for n,h in enumerate([5.2,5.65,6.1]):
 zc=-6+n*6
 for side in [-1,1]:
  # A continuous curved crown above the roof shoulder, leaning inward like an opened sheet.
  points=[]
  for j in range(13):
   t=j/12; z=zc-2.5+5*t
   points.append((side*(7.55-.55*math.sin(math.pi*t)),h+.85+2.35*math.sin(math.pi*t),z))
  wing_profiles.append(points)
  for j in range(12):
   beam('Paper wing curved crown','walnut',points[j],points[j+1],.24,.28,.018)
   a=points[j];b=points[j+1]
   beam('Crown bronze pencil edge','bronze',(a[0]+side*.13,a[1],a[2]),(b[0]+side*.13,b[1],b[2]),.025,.028,.006)
  beam('Continuous eave registration beam','walnut',(side*7.55,h+.65,zc-2.5),(side*7.55,h+.65,zc+2.5),.22,.23,.018)
  for j in range(0,13,2 if n==0 else 1):
   t=j/12; p=points[j]
   beam('Whole sheet rib' if n==0 else 'Annotation grid rib' if n==1 else 'Dense archive fin','cedar',(side*7.55,h+.65,p[2]),p,.10 if n<2 else .16,.12,.012)
  if n==1:
   for f in [.33,.66]:
    for j in range(12):
     a=points[j];b=points[j+1]
     beam('Annotation horizontal lattice','oak',(side*7.55+(a[0]-side*7.55)*f,h+.65+(a[1]-h-.65)*f,a[2]),(side*7.55+(b[0]-side*7.55)*f,h+.65+(b[1]-h-.65)*f,b[2]),.06,.065,.008)
  for dz in [-2.5,2.5]:
   beam('Column to wing riser','walnut',(side*7.25,h-.2,zc+dz),(side*7.55,h+.85,zc+dz),.20,.20,.018)
   box('Wing footing collar','steel',(side*7.25,h-.18,zc+dz),(.42,.18,.42),.018)
  if n==2:
   for j in range(1,12):
    z=zc-2.5+j*5/12
    box('Archive index bronze tab','bronze',(side*7.69,h+.88,z),(.035,.18,.22),.008)
# Worktable rails stay inside the original protected annotation footprint.
for z in [-1.22,1.42]:
 box('Fixed annotation guide rail','steel',(4.9,1.145,z),(3.35,.09,.065),.01)
 for x in [3.36,6.44]:box('Guide end shoe','bronze',(x,1.13,z),(.13,.13,.15),.012)
# Generation desk edge clips, archive file pulls and front index frames give the workflow scale.
for x in [-6.2,-3.4]:
 for z in [-6.65,-5.25]:box('Whole sheet brass corner clip','bronze',(x,1.11,z),(.14,.035,.14),.008)
for x in [-4.85,4.85]:
 for z,h,rows in [(6.7,1.55,8),(4.8,1.1,5)]:
  for row in range(rows):
   y=(row+.5)*h/rows
   box('Archive recessed label frame','steel',(x,y,z-.527),(.54,.09,.025),.006)
   box('Archive paper index insert','paper',(x,y,z-.543),(.43,.055,.012),.003)
   box('Archive bronze pull','bronze',(x+.65,y,z-.56),(.31,.035,.06),.008)
static_count=len(parts)
# Local moving detail follows the original bounded annotation carriage without changing its law.
for x in [-.9,.9]:
 for z in [-.96,.96]:
  box('Annotation corner shoe','bronze',(x,.055,z),(.12,.07,.12),.01)
  box('Annotation registration pin','steel',(x,.11,z),(.038,.07,.038),.006)
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts[:static_count]),('carriage',parts[static_count:])]:
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
data={'version':1,'source':'Blender static assembly and local moving carriage prototype','sections':sections,'wingProfiles':wing_profiles}
js='/* Generated by tools/model-ink.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="ink-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="ink-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardInkDetail={data,attach(b){return add(b,"static",b.root)},attachCarriage(b,parent){return add(b,"carriage",parent)}};\n})(window);\n'
(ROOT/'assets/ink-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/ink/ink-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/ink/model-report.json').write_text(json.dumps(report,indent=2));print(report)
