"""Author seated stepped eaves for the actual production B20 reading garden.
Run: /usr/bin/blender -b -t 4 --python tools/model-moonsnow.py
Closed Blender solids, two cached material batches, metres. Original sources stay frozen.
"""
import bpy, bmesh, json, pathlib, hashlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/moonsnow';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color in {'cedar':'786b55','bronze':'84785e'}.items():
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1);materials[name]=mat
parts,contacts,boxes,sleeves=[],[],[],[]
def blender(p):return Vector((p[0],-p[2],p[1]))
def runtime(p):return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def register(obj,name,mat,role,zone,euler=2):
    obj.name=name;obj.data.materials.append(materials[mat]);obj['role']=role;obj['zone']=zone;obj['expected_euler']=euler;parts.append(obj);return obj

def box(name,role,zone,center,size):
    bpy.ops.mesh.primitive_cube_add(size=1,location=blender(center));obj=bpy.context.object;obj.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=obj.modifiers.new('Readable stepped timber arris','BEVEL');mod.width=.008;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    boxes.append({'id':name,'center':center,'size':size,'bevel':.008});return register(obj,name,'cedar',role,zone)
def sleeve(name,zone,x,y,z):
    vertices=[]
    for yy in [y-.09,y+.09]:
        for size in [.33,.17]:
            vertices += [tuple(blender((x+sx*size/2,yy,z+sz*size/2))) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    faces=[]
    for i in range(4):
        j=(i+1)%4;faces += [(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),(i,i+4,j+4,j),(i+8,j+8,j+12,i+12)]
    data=bpy.data.meshes.new(name+'-true-through-bore');data.from_pydata(vertices,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    sleeves.append({'id':name,'center':[x,y,z],'height':.18,'outer':.33,'inner':.17})
    return register(obj,name,'bronze','true hollow post saddle with positive timber seat',zone,0)
def contact(a,b,p,purpose):contacts.append({'component':a,'target':b,'point':p,'purpose':purpose,'type':'positive-volume intentional seat'})

zones=[{'name':'turning-corridor','xs':[-8.96,-6.43],'zs':[-6.8,-3.08,.6],'baseY':3.04,'railY':3.43,'centerZ':-3.1,'length':7.62},
       {'name':'shared-study','xs':[2.55,9.14],'zs':[4.24,9.49],'baseY':3.15,'railY':3.62,'centerZ':6.87,'length':5.5}]
for zone in zones:
    name,h=zone['name'],zone['baseY']
    for side,(x,direction) in enumerate(zip(zone['xs'],[-1,1]),1):
        rail=f'{name}-{side}-eave';lip=rail+'-lower-lip'
        box(rail,'continuous outer eave fascia seated on retained longitudinal timber',name,[x+direction*.13,zone['railY'],zone['centerZ']],[.18,.24,zone['length']])
        box(lip,'recessed second eave step with readable side and end offsets',name,[x+direction*.20,zone['railY']-(.06 if name=='shared-study' else .08),zone['centerZ']],[.10,.13,zone['length']-.16])
        contact(lip,rail,[x+direction*.17,zone['railY']-(.06 if name=='shared-study' else .08),zone['centerZ']],'70mm plan overlap and 80mm end reveal between two continuous eave tiers')
        for i,z in enumerate(zone['zs'],1):
            prefix=f'{name}-{side}-{i}';heel=prefix+'-heel';middle=prefix+'-middle';cap=prefix+'-cap';collar=prefix+'-post-saddle'
            rear_seat=name=='shared-study' and i==2
            middle_z=z-.31 if rear_seat else z
            cap_z=z-.35 if rear_seat else z
            cap_y=h+(.29 if name=='shared-study' else .27)
            box(heel,'lower corbel heel positively seated in the original post',name,[x,h,z],[.25,.22,.42 if rear_seat else .25])
            box(middle,'middle stepped timber corbel extending toward the eave',name,[x+direction*.055,h+.14,middle_z],[.43,.18,.32])
            box(cap,'upper cantilever cap supporting the separate eave line',name,[x+direction*.10,cap_y,cap_z],[.57,.16,.40])
            sleeve(collar,name,x,h+.005,z)
            contact(heel,'original-'+name+'-post',[x,h,z],'Original 190mm timber post remains continuous through the corbel heel')
            contact(collar,'original-'+name+'-post',[x+.09,h+.005,z],'True 170mm bore seats10mm into original190mm post')
            contact(collar,heel,[x+.105,h+.005,z],'Closed bronze annulus seats on the actual lower timber heel')
            contact(middle,heel,[x+direction*.055,h+.08,z-.18 if rear_seat else z],'60mm vertical overlap between stepped lower and middle timber')
            contact(cap,middle,[x+direction*.10,h+(.22 if name=='shared-study' else .215),cap_z],'40mm vertical overlap between middle and upper corbel')
            contact(rail,cap,[x+direction*.13,cap_y+.07,cap_z],'Actual upper cap positively overlaps continuous eave fascia')
            contact(rail,'original-'+name+'-longitudinal-beam',[x+direction*.065,zone['railY']-.07,z],'Eave fascia shares an interior seat with original longitudinal beam')

entry=[('entry-reveal-seat',[-3.455,3.13,-7.80],[2.17,.18,.42]),
       ('entry-reveal-middle',[-3.455,3.04,-8.10],[1.91,.16,.36]),
       ('entry-reveal-front',[-3.455,2.96,-8.34],[1.73,.13,.28]),
       ('entry-left-return',[-4.58,3.00,-7.89],[.16,.44,.60]),
       ('entry-right-return',[-2.46,3.00,-7.89],[.16,.44,.60])]
for name,center,size in entry:box(name,'stepped side-door reveal retaining full original jamb width and moon-window', 'entry',center,size)
contact('entry-reveal-seat','original-entry-lintel',[-3.455,3.205,-7.80],'New first reveal has finite interior overlap with original timber lintel')
contact('entry-reveal-middle','entry-reveal-seat',[-3.455,3.08,-7.97],'Layered header has positive overlap with the original-seated reveal')
contact('entry-reveal-front','entry-reveal-middle',[-3.455,2.99,-8.24],'Forward header is positively seated while maintaining a visible lower step')
contact('entry-left-return','original-moon-window-wall',[-4.58,3.0,-7.70],'Return remains outside original doorway and seats in retained masonry')
contact('entry-right-return','original-entry-short-cheek',[-2.46,3.0,-7.70],'Return is seated in the original short masonry cheek')
contact('entry-reveal-seat','entry-left-return',[-4.52,3.13,-7.89],'Left return and header have40mm positive end overlap')
contact('entry-reveal-seat','entry-right-return',[-2.46,3.13,-7.89],'Right return shares the original lintel receiving end')

bpy.context.view_layer.update();batches={};components=[];all_points=[]
for obj in parts:
    obj.data.calc_loop_triangles();material=obj.data.materials[0].name;positions=batches.setdefault(material,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[j].co)) for j in tri.vertices];assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for v in vs:p=[round(x,5) for x in v];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data);closed=all(e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free();assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[j] for p in points) for j in range(3)],'max':[max(p[j] for p in points) for j in range(3)]}
    components.append({'id':obj.name,'role':obj['role'],'zone':obj['zone'],'material':material,'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)});all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values());assert len(parts)==53 and len(batches)==2 and triangles==2212
spec={'buildingIndex':20,'productionBuilder':'assets/moon-snow-garden.js','units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y','interpretation':'Stepped entrance reveals lead into the existing turning corridor; separately supported eave lines clarify the corridor and shared study without covering the moon aperture, blank wall or paired paths.','sourceReading':'assets/readings/20.json','sourceReadingSHA256':hashlib.sha256((ROOT/'assets/readings/20.json').read_bytes()).hexdigest(),'zones':zones,'boxes':boxes,'postSaddles':sleeves,'newRoofSkins':0,'roofPenetrations':0,'movingComponentsAdded':0,'materials':['cedar','bronze'],'bounds':{'min':[min(p[j] for p in all_points) for j in range(3)],'max':[max(p[j] for p in all_points) for j in range(3)]},'retention':'Apart from six original paving rectangles and85 matching fine joints raised1mm in the production builder, the original garden fabric, moon opening, blank resting wall, paired paths, desk, painting, four integrated inscriptions, twelve anchors, sliding lattice and collision footprints remain unchanged. Original finish runs before detail attachment.','limits':'Architectural interpretation and mesh/contact evidence only; not structural certification. No new text, imagery, source link, roof skin, motion or lighting.'}
data={'version':1,'source':'Blender closed stepped timber eaves, entrance reveals and true hollow bronze saddles','sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-moonsnow.py using Blender; closed stepped eaves and true hollow post saddles. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardMoonsnowDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='moonsnow-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='moonsnow-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Preserve the original garden layout and integrated reading before unioning actual detail bounds.
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
asset=ROOT/'assets/moonsnow-detail.js';asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'moonsnow-detail.blend'));print('MOONSNOW_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
