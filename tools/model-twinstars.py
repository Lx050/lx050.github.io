"""Blender-authored detail geometry, exported without an extra runtime loader.
Run: blender -b -t 2 --python tools/model-twinstars.py
Three.js metres (x,y-up,z) are mapped to Blender (x,-z,y).
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
(ROOT/'qa-results/twinstars').mkdir(parents=True,exist_ok=True)
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
# Two equally sized vaults retain independent entrances and an unbuilt common center.
# Their difference is in copper seam direction, never in area, height or rank.
def mesh_object(name,mat,verts,faces):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(x,-z,y) for x,y,z in verts],[],faces);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);parts.append(o);return o
N=32
# Shell thickness is vertical, consistent with the courtyard's existing closed roof contract.
def vault(cx):
 verts=[]
 for dy in [0,.16]:
  for z in [-8.3,8.3]:
   for k in range(N+1):
    t=math.pi*k/N;verts.append((cx+3.275*math.cos(t),6.27+3.9*math.sin(t)-dy,z))
 L=N+1;faces=[]
 for k in range(N):
  faces.extend([(k,k+1,L+k+1,L+k),(2*L+k,3*L+k,3*L+k+1,2*L+k+1),(k,2*L+k,2*L+k+1,k+1),(L+k,L+k+1,3*L+k+1,3*L+k)])
 faces.extend([(0,L,3*L,2*L),(N,2*L+N,3*L+N,L+N)])
 o=mesh_object('Closed equal copper vault','copper',verts,faces)
 bm=bmesh.new();bm.from_mesh(o.data);assert all(e.is_manifold for e in bm.edges);assert bm.calc_volume(signed=True)>0;bm.free()
# A broad continuous arched rib is a single closed mesh rather than dozens of loose blocks.
def arch(cx,z,halfwidth,rise,base,band,depth,mat,name):
 verts=[]
 for zz in [z-depth/2,z+depth/2]:
  for inset in [0,band]:
   for k in range(N+1):
    t=math.pi*k/N;verts.append((cx+(halfwidth-inset)*math.cos(t),base+(rise-inset)*math.sin(t),zz))
 L=N+1;faces=[]
 for k in range(N):faces.extend([(k,k+1,L+k+1,L+k),(2*L+k,3*L+k,3*L+k+1,2*L+k+1),(k,2*L+k,2*L+k+1,k+1),(L+k,L+k+1,3*L+k+1,3*L+k)])
 faces.extend([(0,L,3*L,2*L),(N,2*L+N,3*L+N,L+N)])
 return mesh_object(name,mat,verts,faces)
for side in [-1,1]:
 cx=side*6.3;vault(cx)
 for z in [-7.45,0,7.45]:
  arch(cx,z,3.275,3.9,6.11,.22,.24,'oak','Continuous structural vault rib')
  for x in [cx-3.05,cx+3.05]:
   box('Arch spring bearing','bronze',(x,6.13,z),(.35,.35,.34),.018)
 # Deep, layered entrance arch becomes the unmistakable dual-book silhouette.
 for z in [-8.27,8.27]:
  arch(cx,z,3.36,4.0,6.24,.22,.22,'cedar','Deep entrance arch fascia')
  arch(cx,z+(-.13 if z<0 else .13),3.37,4.01,6.24,.045,.05,'bronze','Fine entrance arch inlay')
 # Four long seams on one roof; four transverse seams on its equal partner.
 if side<0:
  for k in [5,11,21,27]:
   t=math.pi*k/N;x=cx+3.275*math.cos(t);y=6.27+3.9*math.sin(t)
   box('Longitudinal standing seam','bronze',(x,y+.035,0),(.035,.06,16.49),.006)
 else:
  for z in [-5.55,-1.85,1.85,5.55]:
   arch(cx,z,3.30,3.925,6.27,.035,.045,'bronze','Transverse standing seam')
 for x in [cx-3.275,cx+3.275]:
  box('Continuous spring purlin','cedar',(x,6.04,0),(.20,.22,16.55),.018)
  box('Copper gutter channel','copper',(x,6.25,0),(.20,.055,16.6),.009)
  for dx in [-.095,.095]:box('Gutter turned edge','copper',(x+dx,6.29,0),(.025,.09,16.6),.004)
 # Four windows remain the original four registers, framed rather than filled.
 for z in [-5.55,-1.85,1.85,5.55]:
  for zz in [z-1.43,z+1.43]:box('Outer light slot jamb','cedar',(side*9.37,5.4,zz),(.16,1.10,.07),.009)
  for y in [4.87,5.93]:box('Outer light slot sill','oak',(side*9.37,y,z),(.19,.08,2.93),.01)
  # Fixed head guide allows the original .19 m translation as well as rotation.
  box('Screen sliding head guide','steel',(side*3.17,5.36,z),(.13,.07,.65),.008)
  box('Screen head guide hanger','bronze',(side*3.17,5.73,z),(.06,.70,.06),.008)
 # Working tables keep their two distinct materials while sharing exact construction scale.
 for zz in [.4-1.46,.4+1.46]:box('Worktable end apron','oak',(side*5.2,.78,zz),(2.54,.22,.10),.014)
 for x in [side*5.2-1.25,side*5.2+1.25]:box('Worktable long apron','cedar',(x,.78,.4),(.10,.22,2.93),.014)
 # Small ledge aprons articulate the common work edge, not a central throne.
 for zz in [-1.20,1.20]:box('Shared ledge apron','cedar',(side*2.77,.74,zz),(.64,.18,.08),.01)
# The two existing short connectors get visible edge laminations; their footprint is unchanged.
for z in [-5.1,5.1]:
 for zz in [z-.81,z+.81]:box('Connector layered edge','oak',(0,5.53,zz),(7.13,.14,.08),.012)
static_count=len(parts)
# Local screen parts follow the existing original pivot, preserving its reciprocal motion.
for z in [-1.34,1.34]:box('Reciprocal screen edge stile','oak',(0,0,z),(.13,1.52,.07),.01)
for y in [-.76,.76]:box('Reciprocal screen frame rail','oak',(0,y,0),(.13,.055,2.73),.008)
for y in [-.81,.81]:box('Screen pivot socket','bronze',(0,y,0),(.11,.09,.11),.012)
box('Sliding pivot tongue','bronze',(0,.845,0),(.07,.08,.11),.008)
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
data={'version':1,'source':'Blender static assembly and local moving screen prototype','sections':sections}
js='/* Generated by tools/model-twinstars.py using Blender. */\n(function(g){\nconst data='+json.dumps(data,separators=(',',':'))+';\nconst cache=new WeakMap();function add(b,section,parent){let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}const group=new b.T.Group();group.name="twinstars-blender-"+section;for(const [material,positions] of Object.entries(data.sections[section].materials)){const key=section+material;let geometry=cached[key];if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute("position",new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();cached[key]=geometry;}const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name="twinstars-"+section+"-"+material;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}parent.add(group);return group;}g.CourtyardTwinstarsDetail={data,attach(b){return add(b,"static",b.root)},attachScreen(b,parent){return add(b,"screen",parent)}};\n})(window);\n'
(ROOT/'assets/twinstars-detail.js').write_text(js)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'qa-results/twinstars/twinstars-detail.blend'))
report={name:{k:v for k,v in value.items() if k!='materials'} for name,value in sections.items()}
(ROOT/'qa-results/twinstars/model-report.json').write_text(json.dumps(report,indent=2));print(report)
