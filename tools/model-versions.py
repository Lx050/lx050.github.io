"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-versions.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/versions').mkdir(parents=True,exist_ok=True)
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
# Five retained editorial layers become five coherent folded portals, not new roof skins.
# Existing roof surfaces, columns, desks, inscriptions and the final unfinished bay remain untouched.
portal_profiles=[]
for n,h in enumerate([6.05,6.45,6.8,7.13,7.42]):
 z=-8.2+n*3.28;outer=9.0-n*.33;spring=h+1.8;crest=h+2.6
 profile=[(-outer,spring,z),(-2.95,crest,z),(2.95,crest,z),(outer,spring,z)]
 portal_profiles.append({'layer':n,'z':z,'outer':outer,'spring':spring,'crest':crest})
 for side in [-1,1]:
  # A deep book-spine casing rests on the original retained wall, wholly above body height.
  box('Revision portal book spine','limestone' if n==0 else 'cedar',(side*outer,(3.2+spring)/2,z),(.32,spring-3.2,.52),.025)
  box('Portal spring saddle','steel',(side*outer,spring-.02,z),(.44,.30,.62),.016)
  # A narrow face inlay acquires finer subdivision with later revisions.
  for k in range(n+1):
   yy=4.0+k*.40
   box('Retained revision face key','bronze',(side*outer-side*.172,yy,z),(.025,.11,.23),.005)
 for k in range(3):
  beam('Folded revision portal girder','cedar',profile[k],profile[k+1],.40,.52,.025)
  # Small shadow line on the forward face reinforces the continuous outline.
  a,b=profile[k],profile[k+1]
  beam('Portal continuous face inlay','bronze',(a[0],a[1]-.02,a[2]-.214),(b[0],b[1]-.02,b[2]-.214),.032,.035,.005)
 for x in [-2.95,2.95]:
  box('Fold shoulder joint plate','steel',(x,crest-.015,z-.217),(.42,.30,.035),.009)
  for xx in [-.11,.11]:box('Fold shoulder pin','bronze',(x+xx,crest-.015,z-.245),(.045,.045,.035),.006)
 # Exposed head guide and a true roof hanger for the existing movable comparison sheet.
 roof_under=h+.27+(5.0-2.8)/(outer-2.65)*1.1-.18
 box('Proof layer sliding head guide','steel',(5.0,5.07,z),(.15,.09,.68),.01)
 box('Proof head guide hanger','bronze',(5.0,(5.115+roof_under)/2,z),(.06,roof_under-5.115,.06),.007)
 box('Proof hanger roof shoe','steel',(5.0,roof_under+.04,z),(.22,.12,.20),.012)
 # Five actual proof desks receive aprons inside their preserved footprints.
 cx=-(outer+3.35)/2
 for zz in [z-.49,z+.49]:box('Retained proof desk apron','limestone' if n==0 else 'oak',(cx,.74,zz),(2.19,.22,.08),.014)
 for x in [cx-1.09,cx+1.09]:box('Proof desk end joint','cedar',(x,.74,z),(.08,.22,.98),.012)
 # Sill corners reinforce retained masonry rather than adding low obstacles.
 for side in [-1,1]:
  for zz in [z-1.19,z+1.19]:box('Retained wall top coping return','limestone',(side*outer,3.24,zz),(.29,.08,.12),.01)
static_count=len(parts)
# One lightweight local cassette follows each of the five original proof-layer pivots.
for x in [-1.58,1.58]:box('Proof cassette vertical edge','oak',(x,0,0),(.06,1.18,.10),.009)
for y in [-.57,.57]:box('Proof cassette horizontal edge','oak',(0,y,0),(3.22,.06,.10),.009)
box('Moving proof vertical journal','bronze',(0,.66,0),(.10,.14,.10),.01)
# Export static assembly and one reusable moving prototype as exact Blender meshes.
bpy.context.view_layer.update()
sections={}
for section,objects in [('static',parts[:static_count]),('screen',parts[static_count:])]:
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
data={'version':1,'source':'Blender static assembly and local moving screen prototype','sections':sections,'portalProfiles':portal_profiles}
js='/* Generated by tools/model-versions.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="versions-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="versions-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardVersionsDetail={data,attach(b){return add(b,"static",b.root)},attachScreen(b,parent){return add(b,"screen",parent)}};\n})(window);\n'
(ROOT/'assets/versions-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/versions/versions-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/versions/model-report.json').write_text(json.dumps(report,indent=2));print(report)
