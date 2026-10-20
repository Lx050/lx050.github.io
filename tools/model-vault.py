"""Closed Blender entry joinery for the original B9 Vaultwarden pavilion.
Run /usr/bin/blender -b -t 4 --python tools/model-vault.py
Preserves all old shell, frame, parked wheel, furniture, content and motion.
"""
import bpy,bmesh,json,pathlib,hashlib,math
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/vault';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'limestone':'c7c3b2','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat
parts,contacts,arches,collars=[],[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def mesh(name,vertices,faces,mat,role,zone,euler=2):
    data=bpy.data.meshes.new(name+'-closed-mesh');data.from_pydata([tuple(blender(v)) for v in vertices],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[mat]);obj['role']=role;obj['zone']=zone;obj['expected_euler']=euler;parts.append(obj);return obj

def arch(name,outer,inner,cy,z0,z1):
    n=24;vertices=[]
    for z in [z0,z1]:
        for rx,ry in [outer,inner]:
            vertices += [(rx*math.cos(i*math.pi/n),cy+ry*math.sin(i*math.pi/n),z) for i in range(n+1)]
    a=n+1;b=2*a;faces=[]
    for i in range(n):
        j=i+1;faces += [(i,j,j+b,i+b),(i+a,i+a+b,j+a+b,j+a),(i,i+a,j+a,j),(i+b,j+b,j+a+b,i+a+b)]
    faces += [(0,b,b+a,a),(n,n+a,n+a+b,n+b)]
    arches.append({'id':name,'segments':n,'outerRadii':outer,'innerRadii':inner,'springY':cy,'depth':[z0,z1]})
    return mesh(name,vertices,faces,'limestone','closed solid elliptical archivolt with finite depth and stepped contour','entry')

def collar(name,x,y,z,outer=.54,inner=.396,h=.14):
    vertices=[]
    for yy in [y-h/2,y+h/2]:
        for size in [outer,inner]:
            vertices += [(x+sx*size/2,yy,z+sz*size/2) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    faces=[]
    for i in range(4):
        j=(i+1)%4;faces += [(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),(i,i+4,j+4,j),(i+8,j+8,j+12,i+12)]
    collars.append({'id':name,'center':[x,y,z],'outer':outer,'inner':inner,'height':h})
    return mesh(name,vertices,faces,'bronze','true open-ended square collar with finite seat into retained 420mm steel post','wheel' if 'wheel' in name else 'entry',0)

foot_profile=[(-6.82,4.78),(-7.18,4.78),(-7.42,5.03),(-8.04,5.28),(-8.04,5.58),(-6.82,5.58)]
def foot(name,side):
    n=len(foot_profile);vertices=[(side*x,y,z) for x in [6.535,7.285] for z,y in foot_profile]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vertices,faces,'limestone','solid stepped arch-foot corbel seated in original steel column and bearing all three archivolts','entry')
def contact(a,b,p,purpose):contacts.append({'component':a,'target':b,'point':p,'purpose':purpose,'type':'positive-volume intentional seat'})
for i,(outer,inner,cy,z0,z1) in enumerate([((7.12,3.34),(6.79,3.00),5.48,-7.46,-6.86),((7.00,3.12),(6.69,2.81),5.46,-7.74,-7.28),((6.88,2.90),(6.52,2.55),5.44,-8.00,-7.56)],1):
    arch('entry-arch-tier-'+str(i),outer,inner,cy,z0,z1)
for side,label in [(-1,'left'),(1,'right')]:
    foot(label+'-stepped-arch-foot',side);collar(label+'-hollow-arch-collar',side*7,5.09,-7)
    contact(label+'-stepped-arch-foot','original-front-steel-post-'+label,[side*7,5.3,-7.08],'Stepped corbel has a finite volume seat into retained 420mm post')
    contact(label+'-hollow-arch-collar','original-front-steel-post-'+label,[side*7.205,5.09,-7],'396mm through-bore seats 12mm into the actual 420mm post')
    contact('entry-arch-tier-1',label+'-stepped-arch-foot',[side*6.95,5.52,-7.12],'Outer 600mm-deep band bears on complete stone corbel')
    contact('entry-arch-tier-2',label+'-stepped-arch-foot',[side*6.85,5.52,-7.63],'Middle 460mm-deep band bears on stepped stone foot')
    contact('entry-arch-tier-3',label+'-stepped-arch-foot',[side*6.70,5.52,-7.86],'Inner 440mm-deep band bears on projecting stone shoulder')
contact('entry-arch-tier-1','entry-arch-tier-2',[0,8.54,-7.36],'Finite overlap between separately stepped stone arch bands')
contact('entry-arch-tier-2','entry-arch-tier-3',[0,8.30,-7.65],'Finite overlap between separately stepped stone arch bands')
# The great wheel is the unchanged original object, permanently parked to one side.
# A compact rear corbel ties its upper-left rim to the actual front steel post;
# no new door, lock, mechanism, low obstacle or claim about vault contents is added.
a=Vector((-7.03,0,-6.98));b=Vector((-6.16,0,-7.615));normal=Vector((-(b-a).z,0,(b-a).x)).normalized()*.14
vertices=[]
for point,lo,hi in [(a,4.23,4.73),(b,4.44,4.70)]:
    for dy,s in [(lo,-1),(lo,1),(hi,1),(hi,-1)]:
        p=point+normal*s;vertices.append((p.x,dy,p.z))
faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
mesh('wheel-tapered-parking-corbel',vertices,faces,'bronze','solid tapered static rear support for the retained side-parked wheel','wheel')
collar('wheel-hollow-post-collar',-7,4.54,-7,.56,.396,.28)
contact('wheel-tapered-parking-corbel','original-front-steel-post-left',[-7,4.55,-7],'Rear corbel seats into the original post; its full depth remains above the visitor body')
contact('wheel-hollow-post-collar','original-front-steel-post-left',[-7.205,4.54,-7],'True hollow collar seats around the retained original steel post')
contact('wheel-tapered-parking-corbel','wheel-hollow-post-collar',[-6.755,4.55,-7.15],'Finite side seat between tapered corbel and hollow post collar')
contact('wheel-tapered-parking-corbel','original-parked-bronze-wheel-rim',[-6.18,4.56,-7.6],'Support meets actual existing bronze torus; wheel stays in its original position')
bpy.context.view_layer.update();batches={};components=[];all_points=[]
for obj in parts:
    obj.data.calc_loop_triangles();material=obj.data.materials[0].name;positions=batches.setdefault(material,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[j].co)) for j in tri.vertices];assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for v in vs:p=[round(x,5) for x in v];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free();assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[j] for p in points) for j in range(3)],'max':[max(p[j] for p in points) for j in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'zone':obj['zone'],'material':material,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(parts)==9 and len(batches)==2 and triangles==736
spec={'buildingIndex':9,'productionBuilder':'assets/architecture.js i === 9','units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Three deep stepped limestone archivolts under the retained copper barrel, seated arch-foot corbels and through-bored bronze post collars; one compact static rear support for the unchanged side-parked great wheel. The open centre, old shell, posts, wheel, cabinets, content and original rooflight are retained.','sourceReading':'assets/readings/9.json','sourceReadingSHA256':hashlib.sha256((ROOT/'assets/readings/9.json').read_bytes()).hexdigest(),'entryArches':arches,'hollowPostCollars':collars,'archFootProfileZY':foot_profile,'newRoofSkins':0,'roofPenetrations':0,'movingComponentsAdded':0,'materials':['limestone','bronze'],'bounds':{'min':[min(p[j] for p in all_points) for j in range(3)],'max':[max(p[j] for p in all_points) for j in range(3)]},'retention':'Every original mesh, material, transform, mechanism, physical/reading collider, title, URL and public source text is unchanged. Original finish runs before additive attachment so dimensions, light suspension and reading placement remain unchanged; actual culling bounds are unioned.','limits':'Architectural interpretation and mesh/contact evidence only; not structural certification. Public email-first login and product identity disclaimer only. No login, credentials, imitation secrets, invented internal functionality, added text, imagery, source link, roof skin, motion or runtime lighting.'}
data={'version':1,'source':'Blender closed elliptical entry bands, stepped solid feet and genuine through-bored collars','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-vault.py using Blender; additive entry arch and parked-wheel joinery. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardVaultDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='vault-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='vault-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Finish the original layout and light suspension before adding the independent static assembly.
  const finish=b.finish;
  b.finish=function(...args){
    const result=finish.apply(b,args);b.root.add(group);b.root.updateMatrixWorld(true);
    const extent=new b.T.Box3().setFromObject(group);
    result.metadata.bounds.union(extent);result.height=Math.max(result.height,extent.max.y);
    return result;
  };
  return group;
}};
})(window);
'''
asset=ROOT/'assets/vault-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'vault-detail.blend'));print('VAULT_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
