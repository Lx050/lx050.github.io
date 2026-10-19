"""Closed Blender joinery for the actual original B8 RSS reading pavilion.
Run /usr/bin/blender -b -t 4 --python tools/model-rss.py
Existing eight-column frame, octagonal roof, lantern and all public content stay intact.
"""
import bpy,bmesh,json,pathlib,hashlib,math
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/rss';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'oak':'9c8c72','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat
parts,contacts,rings,sleeves,profiles=[],[],[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def mesh(name,vertices,faces,mat,role,zone,euler=2):
    data=bpy.data.meshes.new(name+'-closed-mesh');data.from_pydata([tuple(blender(v)) for v in vertices],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[mat]);obj['role']=role;obj['zone']=zone;obj['expected_euler']=euler;parts.append(obj);return obj
def annulus(name,inner,outer,y,h,angle,mat,zone):
    vertices=[]
    for yy in [y-h/2,y+h/2]:
        for radius in [outer,inner]:
            vertices += [(math.cos(angle+i*math.pi/4)*radius,yy,math.sin(angle+i*math.pi/4)*radius) for i in range(8)]
    faces=[]
    for i in range(8):
        j=(i+1)%8;faces += [(i,j,j+16,i+16),(i+8,i+24,j+24,j+8),(i,i+8,j+8,j),(i+16,j+16,j+24,i+24)]
    rings.append({'id':name,'innerRadius':inner,'outerRadius':outer,'y':y,'height':h,'angle':angle,'sides':8})
    return mesh(name,vertices,faces,mat,'closed eight-sided stepped timber eave ring' if zone=='eaves' else 'closed octagonal lantern seat around retained bronze struts',zone,0)
def sleeve(name,x,z):
    y=4.47;vertices=[]
    for yy in [y-.08,y+.08]:
        for size in [.40,.26]:
            vertices += [(x+sx*size/2,yy,z+sz*size/2) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    faces=[]
    for i in range(4):
        j=(i+1)%4;faces += [(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),(i,i+4,j+4,j),(i+8,j+8,j+12,i+12)]
    sleeves.append({'id':name,'center':[x,y,z],'height':.16,'outer':.40,'inner':.26})
    return mesh(name,vertices,faces,'bronze','true open-ended square post saddle with 10mm radial seat into original 280mm timber','eaves',0)
path=[(6.98,4.45),(7.08,4.65),(7.20,4.84),(7.34,4.99),(7.52,5.12),(7.70,5.20),(7.84,5.27),(7.95,5.35),(8.00,5.45)]
def radial(r,y,t,a):return (math.cos(a)*r-math.sin(a)*t,y,math.sin(a)*r+math.cos(a)*t)
def bracket(name,a):
    lower=[];upper=[]
    for i,(r,y) in enumerate(path):
        p=Vector(path[max(0,i-1)]);q=Vector(path[min(len(path)-1,i+1)]);t=(q-p).normalized();n=Vector((-t.y,t.x));half=.10
        lower.append((r-n.x*half,y-n.y*half));upper.append((r+n.x*half,y+n.y*half))
    profile=lower+upper[::-1];n=len(profile)
    vertices=[radial(r,y,t,a) for t in [-.14,.14] for r,y in profile]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    profiles.append({'id':name,'angle':a,'pathRY':path,'width':.28,'normalThickness':.20})
    return mesh(name,vertices,faces,'oak','continuous solid curved radial corbel seating in retained post and stepped octagonal eaves','eaves')
def contact(a,b,p,purpose):contacts.append({'component':a,'target':b,'point':p,'purpose':purpose,'type':'positive-volume intentional seat'})
for i,(inner,outer,y,h) in enumerate([(6.90,7.45,5.14,.26),(7.20,7.76,5.27,.22),(7.53,8.08,5.39,.18)],1):
    annulus('octagonal-eave-tier-'+str(i),inner,outer,y,h,math.pi/8,'oak','eaves')
# Genuine timber/metal contacts, never sleeves filled by hidden caps or a duplicate roof skin.
for i in range(8):
    a=math.pi/8+i*math.pi/4;x=math.cos(a)*7.1;z=math.sin(a)*7.1;name='post-'+str(i+1)
    bracket(name+'-curved-corbel',a);sleeve(name+'-hollow-saddle',x,z)
    contact(name+'-curved-corbel','original-oak-column-'+str(i+1),radial(7.04,4.51,0,a),'Continuous 200mm-thick corbel is seated inside the original 280mm column')
    contact(name+'-hollow-saddle','original-oak-column-'+str(i+1),[x+.135,4.47,z],'The 260mm bore has a finite 10mm seat into the retained 280mm post; both ends remain open')
    contact(name+'-curved-corbel','octagonal-eave-tier-1',radial(7.40,5.06,0,a),'Solid curved timber positively bears the lower tier')
    contact(name+'-curved-corbel','octagonal-eave-tier-2',radial(7.64,5.20,0,a),'Continuous curved profile positively seats in the middle tier')
    contact(name+'-curved-corbel','octagonal-eave-tier-3',radial(7.92,5.34,0,a),'Curved upper shoulder positively seats in the top tier')
    contact('octagonal-eave-tier-1','original-oak-perimeter-beam-'+str(i+1),radial(7.1*math.cos(math.pi/8),5.245,0,a+math.pi/8),'Closed eave ring seats beneath the complete original eight-beam perimeter')
contact('octagonal-eave-tier-2','octagonal-eave-tier-1',radial(7.32,5.21,0,math.pi/8),'Separate stepped rings overlap radially and vertically')
contact('octagonal-eave-tier-3','octagonal-eave-tier-2',radial(7.64,5.34,0,math.pi/8),'Upper stepped ring has positive radial and vertical lap')
annulus('lantern-inner-bronze-seat',1.20,1.54,8.47,.11,0,'bronze','lantern')
annulus('lantern-lower-oak-seat',1.43,1.67,8.43,.12,0,'oak','lantern')
for i in range(8):
    a=i*math.pi/4
    contact('lantern-inner-bronze-seat','original-bronze-lantern-strut-'+str(i+1),radial(1.35,8.512,0,a),'Seat meets retained bronze strut above original roof shell and below original glass')
contact('lantern-lower-oak-seat','lantern-inner-bronze-seat',[1.48,8.45,0],'Finite stepped lantern-seat overlap; centre remains fully open')
bpy.context.view_layer.update();batches={};components=[];all_points=[]
for obj in parts:
    obj.data.calc_loop_triangles();material=obj.data.materials[0].name;positions=batches.setdefault(material,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[j].co)) for j in tri.vertices];assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for v in vs:p=[round(x,5) for x in v];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free();assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[j] for p in points) for j in range(3)],'max':[max(p[j] for p in points) for j in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'zone':obj['zone'],'material':material,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(parts)==21 and len(batches)==2 and triangles==1120
spec={'buildingIndex':8,'productionBuilder':'assets/architecture.js i === 8','units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Retained octagonal reading pavilion with three bold stepped timber eave rings, eight curved radial corbels, true hollow post saddles, and open lantern seats supported by the actual original bronze struts. The old roof, books, paper, furniture and lantern remain generic existing architectural objects, not claims about private subscriptions or articles.','sourceReading':'assets/readings/8.json','sourceReadingSHA256':hashlib.sha256((ROOT/'assets/readings/8.json').read_bytes()).hexdigest(),'octagonalRings':rings,'postSaddles':sleeves,'corbelProfiles':profiles,'newRoofSkins':0,'roofPenetrations':0,'movingComponentsAdded':0,'materials':['oak','bronze'],'bounds':{'min':[min(p[j] for p in all_points) for j in range(3)],'max':[max(p[j] for p in all_points) for j in range(3)]},'retention':'Every original mesh, material, transform, mechanism, physical/reading collider, title, URL and public source text is unchanged. Original finish runs before additive attachment so dimensions, suspension and reading placement remain unchanged; actual culling bounds are unioned.','limits':'Architectural interpretation and mesh/contact evidence only; not structural certification. Lower joinery seats in retained posts and perimeter beams. Upper seats attach to the existing separate lantern subassembly; no continuous connection to the foundation is claimed. Public WeWe RSS entry and AuthCode boundary only. No login, invented feeds, new text, imagery, source link, roof skin, motion or lighting.'}
data={'version':1,'source':'Blender closed octagonal eave tiers, radial corbels and genuine through-bored sleeves','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-rss.py using Blender; additive octagonal eave and lantern joinery. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardRSSDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='rss-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='rss-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Preserve all original dimensions, suspended lights and reading layout before extending actual bounds.
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
asset=ROOT/'assets/rss-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'rss-detail.blend'));print('RSS_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
