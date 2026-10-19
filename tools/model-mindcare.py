"""Author B24's unequal quiet-walk eave ribs as closed Blender solids.
Run: /usr/bin/blender -b -t 4 --python tools/model-mindcare.py
All coordinates are metres in runtime x,y-up,z; retained original fabric is untouched.
"""
import bpy, bmesh, json, pathlib, hashlib, math
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/mindcare';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'oak':'a99269','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat
parts,contacts,ribs=[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def mesh(name,material,role,walk,vertices,faces,euler):
    data=bpy.data.meshes.new(name+'-closed-solid');data.from_pydata([blender(p) for p in vertices],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(materials[material]);obj['role']=role;obj['walk']=walk;obj['expected_euler']=euler;parts.append(obj);return obj

def swept_rib(name,walk,path,z):
    points=[Vector((x,y,z)) for x,y in path];vertices=[];sections=[]
    for i,p in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized();normal=Vector((-tangent.y,tangent.x,0));thickness=.18-.05*i/(len(points)-1)
        for n,zz in [(-1,-1),(1,-1),(1,1),(-1,1)]:vertices.append(p+normal*n*thickness/2+Vector((0,0,zz*.10)))
        sections.append({'center':list(p),'normal':list(normal),'thickness':round(thickness,9),'depth':.20})
    faces=[(3,2,1,0)]
    for i in range(len(points)-1):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    last=(len(points)-1)*4;faces.append(tuple(last+j for j in range(4)))
    mesh(name,'oak','tapered curved eave rib following an unequal contemplative walk',walk,vertices,faces,2)
    return sections

def block(name,walk,center,size,role,angle=0):
    c=Vector(center);a=Vector((math.cos(angle),math.sin(angle),0));n=Vector((-math.sin(angle),math.cos(angle),0));z=Vector((0,0,1))
    vertices=[c+a*sx*size[0]/2+n*sy*size[1]/2+z*sz*size[2]/2 for sx in [-1,1] for sy in [-1,1] for sz in [-1,1]]
    faces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    mesh(name,'oak',role,walk,vertices,faces,2)
    return {'center':list(c),'size':size,'slopeRadians':angle,'basis':[list(a),list(n),list(z)]}

def sleeve(name,walk,center,axis,normal,length,outer,inner,role):
    c,a,n=Vector(center),Vector(axis).normalized(),Vector(normal).normalized();depth=Vector((0,0,1));vertices=[]
    for end in [-1,1]:
        for size in [outer,inner]:
            for u,v in [(-1,-1),(1,-1),(1,1),(-1,1)]:vertices.append(c+a*end*length/2+n*u*size[0]/2+depth*v*size[1]/2)
    faces=[]
    for i in range(4):
        j=(i+1)%4;faces.extend([(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),(i,i+4,j+4,j),(i+8,j+8,j+12,i+12)])
    mesh(name,'bronze',role,walk,vertices,faces,0)
    return {'center':list(c),'axis':list(a),'normal':list(n),'length':length,'outer':outer,'inner':inner,'topology':'closed genus-one rectangular annular prism with open through-bore'}

paths={
 'long':[[-9.25,4.55],[-9.40,4.70],[-9.58,4.84],[-9.78,4.94],[-9.99,5.00],[-10.18,5.04],[-10.34,5.11],[-10.47,5.22],[-10.56,5.36],[-10.62,5.52],[-10.66,5.69],[-10.68,5.87]],
 'short':[[2.9,4.58],[2.78,4.72],[2.63,4.85],[2.47,4.94],[2.30,4.99],[2.16,5.03],[2.07,5.09],[2.01,5.18],[1.97,5.29],[1.95,5.40],[1.94,5.51],[1.94,5.62]]
}
for walk,rows in [('long',[-8.3,-4.15,0,4.15,8.3]),('short',[-8.3,-2.8,2.8,8.3])]:
    for i,z in enumerate(rows,1):
        prefix=f'{walk}-walk-{i:02d}';path=paths[walk];sections=swept_rib(prefix+'-rib',walk,path,z)
        start=Vector((*path[0],z));root=sleeve(prefix+'-root-saddle',walk,start,[0,1,0],[1,0,0],.28,[.35,.32],[.23,.23],'true hollow root saddle seated around retained original oak post')
        tip=Vector((*path[-1],z));axis=(tip-Vector((*path[-2],z))).normalized();normal=Vector((-axis.y,axis.x,0));center=tip-axis*.13
        ferrule=sleeve(prefix+'-tip-ferrule',walk,center,axis,normal,.18,[.24,.25],[.12,.19],'true hollow stepped ferrule around curved oak cantilever tip')
        contacts.extend([
          {'component':prefix+'-rib','target':'original-oak-structural-post','point':list(start),'purpose':'Rib heel enters the retained post with finite positive-volume timber seat'},
          {'component':prefix+'-root-saddle','target':'original-oak-structural-post','point':list(start+Vector((.12,0,0))),'purpose':'True annulus bore wall overlaps the existing 0.25 m square post by 0.01 m'},
          {'component':prefix+'-tip-ferrule','target':prefix+'-rib','point':list(center+Vector((0,0,.0975))),'purpose':'True ferrule bore wall overlaps oak depth by 0.005 m with 0.025 m exterior sideface steps'}
        ])
        # A real short stool and sloping transverse cap connect the curved rib to
        # the retained, offset fine rafters. Neither part reaches the roof skin.
        refx,edge,slope=(-9.8,-10.025,2.05/3.95) if walk=='long' else (2.65,2.475,1.7/2.525)
        angle=math.atan(slope);roof_normal=Vector((-math.sin(angle),math.cos(angle),0))
        rafter_ref=Vector((refx,5.55+(refx-edge)*slope-.14,z));cap_center=rafter_ref-roof_normal*.065
        bottom=4.985 if walk=='long' else 4.875;top=5.45
        stool=block(prefix+'-rafter-stool',walk,[cap_center.x,(bottom+top)/2,z],[.14,top-bottom,.16],'short rib-to-cap timber stool with stepped side faces')
        cap=block(prefix+'-rafter-cap',walk,cap_center,[.30,.10,.86],'sloped transverse seat positively supporting actual retained fine rafter',angle)
        nearest_z=([-8.045,-3.845,-.345,3.855,8.055] if walk=='long' else [-8.645,-3.045,2.555,8.155])[i-1]
        contacts.extend([
          {'component':prefix+'-rafter-stool','target':prefix+'-rib','point':[cap_center.x,bottom+.015,z],'purpose':'Short timber stool has positive-volume lower seat in the actual curved rib'},
          {'component':prefix+'-rafter-cap','target':prefix+'-rafter-stool','point':[cap_center.x,5.43,z],'purpose':'Sloped cap and stool share an interior joint with different side-face depths'},
          {'component':prefix+'-rafter-cap','target':'original-oak-fine-rafter','point':list(rafter_ref-roof_normal*.029+Vector((0,0,nearest_z-z))),'purpose':'27.5 mm normal overlap at the real retained rafter, with at least25mm bilateral z end steps'}
        ])
        ribs.append({'id':prefix,'walk':walk,'z':z,'sections':sections,'rootSaddle':root,'tipFerrule':ferrule,'rafterStool':stool,'rafterCap':cap,'actualRafterZ':nearest_z})
bpy.context.view_layer.update();batches={};components=[];all_points=[]
for obj in parts:
    obj.data.calc_loop_triangles();material=obj.data.materials[0].name;positions=batches.setdefault(material,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[j].co)) for j in tri.vertices];assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for v in vs:p=[round(x,5) for x in v];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free();assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[j] for p in points) for j in range(3)],'max':[max(p[j] for p in points) for j in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'walk':obj['walk'],'material':material,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(parts)==45 and len(batches)==2 and triangles==1620
spec={'buildingIndex':24,'units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Five longer outward eave curls accompany the long shaded garden walk; four shorter inward curls accompany the shorter pause range. Their unequal cadence follows the already-reviewed timed-practice reading, without mapping duration to an invented health outcome.','sourceReading':'assets/readings/24.json','ribs':ribs,'walkRows':{'long':[-8.3,-4.15,0,4.15,8.3],'short':[-8.3,-2.8,2.8,8.3]},'pathKnots':paths,'ribSection':{'rootInPlane':.18,'tipInPlane':.13,'depth':.20,'sections':12},'rootSaddle':{'outer':[.35,.32],'inner':[.23,.23],'height':.28},'tipFerrule':{'outer':[.24,.25],'inner':[.12,.19],'length':.18,'tipInset':.04},'rafterSeats':{'count':9,'capSize':[.30,.10,.86],'capNormalOffset':.065,'stoolSection':[.14,.16],'description':'Continuous original post to curved rib to short stool to sloped transverse cap to retained fine rafter contact chain'},'newRoofSkins':0,'roofPenetrations':0,'movingComponentsAdded':0,'materials':['oak','bronze'],'bounds':{'min':[min(p[j] for p in all_points) for j in range(3)],'max':[max(p[j] for p in all_points) for j in range(3)]},'retention':'All original roofs, posts, gardens, furniture, screened diary niches, three moving light baffles, clinician-side path, original text and collision footprints remain unchanged. Original finish runs before detail attachment.','limits':'Architectural interpretation and mesh/joint evidence only; not structural certification or a medical claim. No additional animation, text, roof skin, screen, lighting or authenticated product content.'}
data={'version':1,'source':'Blender closed curved oak eave ribs, real under-rafter seats and true hollow bronze joint saddles/ferrules','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-mindcare.py using Blender; closed curved eave ribs, under-rafter seats and true hollow joints. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardMindcareDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='mindcare-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='mindcare-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Preserve original floor size, reading layout and collision footprints before adding eave detail.
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
asset=ROOT/'assets/mindcare-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mindcare-detail.blend'));print('MINDCARE_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
