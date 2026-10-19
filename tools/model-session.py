"""Author B13's continuous human ridge and nine independent tool portals.
Run: /usr/bin/blender -b -t 4 --python tools/model-session.py
Actual closed Blender solids, two shared runtime material batches. Metres.
The reviewed public reading is retained exactly; this is an architectural interpretation.
"""
import bpy, bmesh, json, math, pathlib, hashlib
from mathutils import Vector, Quaternion

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT/'qa-results/session'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
materials = {}
for name,color in {'cedar':'786b55','bronze':'84785e'}.items():
    mat = bpy.data.materials.new(name)
    mat.diffuse_color=(*[int(color[i:i+2],16)/255 for i in (0,2,4)],1)
    materials[name]=mat
parts, contacts, rafters, portals = [], [], [], []

def blender(p): return Vector((p[0],-p[2],p[1]))
def runtime(p): return [round(p.x,6),round(p.z,6),round(-p.y,6)]
def register(obj,name,mat,side,role,euler=2):
    obj.name=name; obj.data.materials.append(materials[mat])
    obj['side']=side;obj['role']=role;obj['expected_euler']=euler
    parts.append(obj);return obj

def box(name,mat,side,role,center,size,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=blender(center));obj=bpy.context.object
    obj.scale=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Small readable timber arris','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return register(obj,name,mat,side,role)

def vertical_sleeve(name,side,x,z,lo,hi,outer,inner,role):
    # One closed genus-one annular prism; open bore has no solid/fake end caps.
    verts=[]
    for y in [lo,hi]:
        for size in [outer,inner]:
            verts += [tuple(blender((x+sx*size/2,y,z+sz*size/2)))
                      for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    faces=[]
    for i in range(4):
        j=(i+1)%4
        faces += [(i,j,j+8,i+8),(i+4,i+12,j+12,j+4),
                  (i,i+4,j+4,j),(i+8,j+8,j+12,i+12)]
    mesh=bpy.data.meshes.new(name+'-through-bore');mesh.from_pydata(verts,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return register(obj,name,'bronze',side,role,0)

def contact(component,target,point,purpose):
    contacts.append({'component':component,'target':target,'point':point,
                     'purpose':purpose,'type':'positive-volume intentional joint seat'})

stations=[-9.55,-5.8,-2.05,1.7,5.45,9.2]
box('human-continuous-ridge','cedar','human','uninterrupted raised timber ridge',
    [-5.5,9.65,0],[.34,.36,20.1],.008)
for i,z in enumerate(stations,1):
    for side,x in [('outer',-8.45),('inner',-2.65)]:
        stem=f'human-{i:02d}-{side}'
        post=stem+'-extension';beam=stem+'-rafter';sleeve=stem+'-roof-sleeve'
        box(post,'cedar','human','short extension seated on the original human-track post',
            [x,6.62,z],[.28,1.0,.28],.008)
        a,end=blender([x,7.0,z]),blender([-5.5,9.65,z]);delta=end-a
        rotation=delta.to_track_quat('Z','Y');length=delta.length
        obj=box(beam,'cedar','human','open rafter above the intact lantern glazing and cap',
                runtime((a+end)/2),[.26,length,.24],.008)
        obj.rotation_euler=rotation.to_euler()
        vertical_sleeve(sleeve,'human',x,z,6.16,6.76,.44,.26,
                        'hollow bronze flashing encloses the low-roof post emergence')
        contact(post,'original-human-post',[x,6.22,z],
                'Original h6.15 post ends at y6.30; extension begins at y6.12')
        contact(beam,post,runtime(a+delta.normalized()*.04),
                'Rafter heel overlaps the short vertical extension')
        contact(beam,'human-continuous-ridge',runtime(end-delta.normalized()*.04),
                'Rafter tip enters the continuous timber ridge')
        contact(sleeve,post,[x+.135,6.55,z],
                'True bore has a 0.01 m seat into the timber faces')
        contact(sleeve,'original-human-low-tile-roof',[x+(.18 if side=='inner' else -.18),6.5,z],
                'Bronze wall overlaps the real low roof and encloses the complete post seam')
        rafters.append({'id':beam,'post':post,'sleeve':sleeve,'from':[x,7.0,z],
            'to':[-5.5,9.65,z],'length':round(length,6),'localSection':[.26,.24],
            'localBasisRuntimeXYZ':[runtime(rotation@Vector(v)) for v in [(1,0,0),(0,1,0),(0,0,1)]]})

heights=[5.1,5.45,5.8,6.05,5.55,6.8,5.7,7.1,6.8,7.25]
for n,h in enumerate(heights):
    if n==4: continue  # The failed-copy opening must remain a real opening.
    z=-9+2*n;stem=f'tool-{n+1:02d}';cross=stem+'-portal-head'
    box(cross,'bronze','tools','independent open portal head, no roof skin or longitudinal tie',
        [5.75,h+.88,z],[5.8,.18,.22])
    for side,x in [('inner',3.05),('outer',8.45)]:
        post=stem+'-'+side+'-portal-post';sleeve=stem+'-'+side+'-roof-sleeve'
        box(post,'bronze','tools','portal extension seated on an original bay lintel and post',
            [x,h+.42,z],[.18,1.04,.18])
        vertical_sleeve(sleeve,'tools',x,z,h-.02,h+.46,.32,.16,
                        'closed bronze through-sleeve around an existing roof penetration')
        contact(post,'original-tool-lintel',[x,h+.04,z],
                'Post base overlaps the exact retained h-centred structural lintel')
        contact(cross,post,[x,h+.86,z],
                'Portal head and vertical leg have a positive overlapping seat')
        contact(sleeve,post,[x+.085,h+.22,z],
                'True bore seats 0.01 m into the bronze portal leg')
        contact(sleeve,'original-tool-roof',[x+(.13 if side=='outer' else -.13),h+.29,z],
                'Bronze wall meets the retained tile/copper cassette')
    portals.append({'session':n+1,'z':z,'retainedHeight':h,'headCenter':[5.75,h+.88,z],
                    'headSize':[5.8,.18,.22],'postX':[3.05,8.45],
                    'postY':[round(h-.1,6),round(h+.94,6)],'postSection':[.18,.18]})

bpy.context.view_layer.update()
batches,components,all_points={},{},[]
components=[]
for obj in parts:
    obj.data.calc_loop_triangles();mat=obj.data.materials[0].name
    positions=batches.setdefault(mat,[]);first=len(positions)//9;points=[]
    for tri in obj.data.loop_triangles:
        vs=[Vector(runtime(obj.matrix_world@obj.data.vertices[i].co)) for i in tri.vertices]
        assert (vs[1]-vs[0]).cross(vs[2]-vs[0]).length>1e-9,obj.name
        for vertex in vs:
            p=[round(v,5) for v in vertex];positions.extend(p);points.append(p)
    bm=bmesh.new();bm.from_mesh(obj.data)
    closed=all(e.is_manifold for e in bm.edges);volume=abs(bm.calc_volume(signed=True))
    euler=len(bm.verts)-len(bm.edges)+len(bm.faces);bm.free()
    assert closed and volume>1e-7 and euler==obj['expected_euler'],(obj.name,euler,volume)
    bounds={'min':[min(p[i] for p in points) for i in range(3)],
            'max':[max(p[i] for p in points) for i in range(3)]}
    components.append({'id':obj.name,'side':obj['side'],'role':obj['role'],'material':mat,
        'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,
        'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)})
    all_points.extend(points)
triangles=sum(len(p)//9 for p in batches.values())
assert len(batches)==2 and triangles<3500,(len(batches),triangles)
spec={'buildingIndex':13,'units':'metres','axes':'Three.js x,y-up,z; Blender x,-z,y',
    'interpretation':'One continuous human timber ridge faces nine distinct tool portals; their unequal heights include setbacks, the failed fifth copy remains uncovered, fatigue remains low, and whoami stays open.',
    'sourceReading':'assets/readings/13.json',
    'reviewedSections':['opening','s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','source-note'],
    'humanRidgeCenter':[-5.5,9.65,0],'humanRidgeSize':[.34,.36,20.1],
    'humanStationsZ':stations,'humanPostX':[-8.45,-2.65],
    'humanExtensionY':[6.12,7.12],'humanExtensionSection':[.28,.28],
    'humanSleeveY':[6.16,6.76],'humanSleeveOuterSection':[.44,.44],
    'humanSleeveInnerSection':[.26,.26],'rafterSection':[.26,.24],
    'timberBevel':.008,'rafters':rafters,'portalCount':9,'toolHeights':heights,'portals':portals,
    'toolSleeveYOffsets':[-.02,.46],'toolSleeveOuterSection':[.32,.32],
    'toolSleeveInnerSection':[.16,.16],
    'sleeveTopology':'Watertight annular rectangular prism; genus one with no plug over its bore',
    'preservedRoofGap':{'session':5,'center':[5.75,5.84,-1],'noAddedFrame':True},
    'humanLanternUntouched':{'glassX':[-6.9,-4.1],'glassY':[6.66,7.74],'capY':7.9},
    'movingComponentsAdded':0,'materials':['cedar','bronze'],
    'bounds':{'min':[min(p[i] for p in all_points) for i in range(3)],
              'max':[max(p[i] for p in all_points) for i in range(3)]},
    'retention':'All original roofs, glass, screens, warm spine, ethical rail, workstations, low fatigue alcove, end opening, reading, motion and collisions remain untouched. Original finish runs before this group is attached.',
    'limits':'Architectural interpretation and geometric joint/contact evidence only. No structural certification, new roof skin, AI neon, progress telemetry, identity-completion claim or new lighting.'}
data={'version':1,'source':'Blender closed continuous human ridge and independent tool portals',
    'sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},
    'spec':spec,'components':components,'contacts':contacts}
script='''/* Generated by tools/model-session.py using Blender; closed timber and true hollow bronze sleeves. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardSessionDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='session-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='session-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Preserve original floor dimensions, reading placement, lamp suspension and collisions.
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
asset=ROOT/'assets/session-detail.js'
asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report={'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},
    'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'session-detail.blend'))
print('SESSION_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
