"""Closed Blender entry joinery for the original B11 知虾标书 document hall.
Run /usr/bin/blender -b -t 4 --python tools/model-dossier.py
Preserves all old shell, masonry frame, shutter, furniture, content and motion.
"""
import bpy,bmesh,json,pathlib,hashlib,math
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/dossier';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'limestone':'c7c3b2','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat

parts,contacts,folds,shoulders,saddles=[],[],[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def mesh(name,vertices,faces,mat,role,zone,euler=2):
    data=bpy.data.meshes.new(name+'-closed-mesh');data.from_pydata([tuple(blender(v)) for v in vertices],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[mat]);obj['role']=role;obj['zone']=zone;obj['expected_euler']=euler;parts.append(obj);return obj

def extrude(name,profile,axis,lo,hi,mat,role):
    n=len(profile)
    def vertex(a,b,c):return (c,b,a) if axis=='x' else ((a,c,b) if axis=='y' else (a,b,c))
    vertices=[vertex(a,b,c) for c in [lo,hi] for a,b in profile]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vertices,faces,mat,role,'entry')
def contact(a,b,p,purpose):contacts.append({'component':a,'target':b,'point':p,'purpose':purpose,'type':'positive-volume intentional seat'})
for i,(span,left,valley,right,thickness,z0,z1) in enumerate([(7.92,7.25,4.18,6.93,.32,-7.13,-6.70),(7.80,7.09,4.02,6.77,.28,-7.32,-6.96),(7.68,6.93,3.86,6.61,.24,-7.48,-7.17)],1):
    upper=[(-span,left),(-.65,valley),(span,right)]
    profile=upper+[(x,y-thickness) for x,y in upper[::-1]]
    name='folded-entry-tier-'+str(i)
    extrude(name,profile,'z',z0,z1,'limestone','closed asymmetric folded stone entry band with deep stepped eave section')
    folds.append({'id':name,'upperXY':upper,'verticalThickness':thickness,'depth':[z0,z1]})
for side,label,low,high in [(-1,'left',6.55,7.16),(1,'right',6.23,6.84)]:
    profile=[(-7.05,4.45),(-7.42,4.45),(-7.64,5.6),(-8.25,low),(-8.25,high),(-7.05,high),(-7.05,5.73),(-7.34,5.73),(-7.34,5.045),(-7.05,5.045)]
    name=label+'-stepped-bearing-shoulder'
    x0,x1=sorted([side*7.42,side*8.18])
    extrude(name,profile,'x',x0,x1,'limestone','closed stepped and tapered stone shoulder with a genuine rear hardware relief and finite seat into retained masonry post')
    shoulders.append({'id':name,'profileZY':profile,'widthX':[x0,x1]})
    center=side*8
    notch=[(-.37,-7.065),(-.223,-7.065),(-.223,-7.223),(.223,-7.223),(.223,-7.065),(.37,-7.065),(.37,-7.40),(-.37,-7.40)]
    name=label+'-openback-bronze-saddle'
    extrude(name,[(center+x,z) for x,z in notch],'y',4.60,4.80,'bronze','closed U-section front saddle with genuine open back and 12mm finite post seat')
    saddles.append({'id':name,'profileXZ':[(center+x,z) for x,z in notch],'heightY':[4.60,4.80],'postWidth':.47,'boreWidth':.446})
    contact(label+'-stepped-bearing-shoulder','original-front-masonry-post-'+label,[center,4.90,-7.15],'Stone shoulder seats into retained masonry shaft; original shaft/base chain remains unchanged')
    contact(name,'original-front-masonry-post-'+label,[center,4.70,-7.229],'The front U saddle seats 12mm into the retained 470mm shaft; back and upper/lower notch stay open')
    contact(name,label+'-stepped-bearing-shoulder',[center,4.70,-7.30],'Finite rear face seat between bronze saddle and projecting stone shoulder')
    for tier,x,y,z in [(1,7.70,7.03 if side<0 else 6.72,-7.09),(2,7.60,6.89 if side<0 else 6.57,-7.20),(3,7.55,6.76 if side<0 else 6.43,-7.32)]:
        contact('folded-entry-tier-'+str(tier),label+'-stepped-bearing-shoulder',[side*x,y,z],'Full closed folded band bears in the projecting stepped stone shoulder')
contact('folded-entry-tier-1','folded-entry-tier-2',[-.65,3.94,-7.04],'Finite vertical and depth lap between the deep rear and middle folded sections')
contact('folded-entry-tier-2','folded-entry-tier-3',[-.65,3.79,-7.25],'Finite vertical and depth lap between the middle and front folded sections')
# Additional finite beam seats are independently audited against the original masonry crossbeam.
for tier,x,y,z in [(1,-4.85,5.8,-7.02),(1,4.82,5.8,-7.02),(2,-5.12,5.8,-7.02),(2,5.25,5.8,-7.02)]:
    contact('folded-entry-tier-'+str(tier),'original-front-masonry-crossbeam',[x,y,z],'Positive-depth bearing into the retained front crossbeam; original beam and post connections remain unchanged')
bpy.context.view_layer.update();batches={};components=[];all_points=[]
for obj in parts:
    obj.data.calc_loop_triangles();material=obj.data.materials[0].name;positions=batches.setdefault(material,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[j].co)) for j in tri.vertices];assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for v in vs:p=[round(x,5) for x in v];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free();assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[j] for p in points) for j in range(3)],'max':[max(p[j] for p in points) for j in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'zone':obj['zone'],'material':material,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(parts)==7 and len(batches)==2 and triangles==188
spec={'buildingIndex':11,'productionBuilder':'assets/architecture.js i === 11','units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Three deep asymmetric folded stone entry bands, offset like an open book beneath the retained copper butterfly roof, with solid stepped bearing shoulders and open-backed bronze saddles seated in the actual original masonry posts. Original roofs, frame, tables, paper, furniture and shutter remain generic existing architecture.','sourceReading':'assets/readings/11.json','sourceReadingSHA256':hashlib.sha256((ROOT/'assets/readings/11.json').read_bytes()).hexdigest(),'foldedEntryBands':folds,'bearingShoulders':shoulders,'openBackSaddles':saddles,'newRoofSkins':0,'roofPenetrations':0,'movingComponentsAdded':0,'materials':['limestone','bronze'],'bounds':{'min':[min(p[j] for p in all_points) for j in range(3)],'max':[max(p[j] for p in all_points) for j in range(3)]},'retention':'Every original mesh, material, transform, mechanism, physical/reading collider, title, URL and public source text is unchanged. Original finish runs before additive attachment so dimensions, light suspension and reading placement remain unchanged; actual culling bounds are unioned.','limits':'Architectural interpretation and mesh/contact evidence only; not structural certification. Public AI bid-document platform identity and login-boundary only. No login, credential collection, invented templates, review, export or bid submission; no additional text, imagery, source links, roof skins, motion or runtime lighting.'}
data={'version':1,'source':'Blender closed asymmetric folded entry bands, stepped solid shoulders and genuinely open-backed saddles','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-dossier.py using Blender; additive folded entry bands and seated shoulders. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardDossierDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='dossier-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='dossier-static-'+material;
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
asset=ROOT/'assets/dossier-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'dossier-detail.blend'));print('DOSSIER_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
