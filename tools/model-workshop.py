"""Author B25's exposed, sleeved timber branch trusses as recoverable Blender solids.
Run: /usr/bin/blender -b -t 4 --python tools/model-workshop.py
Metres: runtime Three.js x,y-up,z becomes Blender x,-z,y. No source code/media fetched.
"""
import bpy, bmesh, json, math, pathlib, hashlib
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-results/workshop'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
materials = {}
for name, color in {'cedar':'786b55', 'bronze':'84785e'}.items():
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*[int(color[i:i+2],16)/255 for i in (0,2,4)], 1)
    materials[name] = mat
parts, contacts, branches, penetrations = [], [], [], []

def blender(p):
    return Vector((p[0], -p[2], p[1]))

def runtime(p):
    return [round(p.x, 6), round(p.z, 6), round(-p.y, 6)]

def register(obj, name, mat, side, role, topology=2):
    obj.name = name
    obj.data.materials.append(materials[mat])
    obj['component_id'], obj['side'], obj['role'] = name, side, role
    obj['expected_euler'] = topology
    parts.append(obj)
    return obj

def box(name, mat, side, role, center, size, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=blender(center))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Inspectable softened timber edge', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return register(obj, name, mat, side, role)

def sleeve(name, side, center, rotation, length):
    # A true hollow square tube, independently watertight with genus one.
    # Four outer and four inner corners at each end; no fake solid plug.
    ow, od, iw, idp = .44, .48, .28, .32
    verts = []
    for z in [-length/2, length/2]:
        for w, d in [(ow, od), (iw, idp)]:
            verts += [(-w/2,-d/2,z),(w/2,-d/2,z),(w/2,d/2,z),(-w/2,d/2,z)]
    faces = []
    for i in range(4):
        j = (i+1)%4
        faces += [(i,j,j+8,i+8), (i+4,i+12,j+12,j+4),
                  (i,i+4,j+4,j), (i+8,j+8,j+12,i+12)]
    mesh = bpy.data.meshes.new(name+'-closed-through-bore')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location, obj.rotation_euler = center, rotation.to_euler()
    return register(obj, name, 'bronze', side, 'hollow inspectable bronze connection sleeve', 0)

def contact(component, target, point, purpose):
    contacts.append({'component':component, 'target':target, 'point':point,
                     'purpose':purpose, 'type':'intentional material overlap'})

# Exact retained b.lean cassettes from assets/content-literary.js B[25].
# Their .17 m thickness is normal to the x-sloping plane.
roof_modules = [
    {'id':'front-paper-tile-cassette','x':-5.65,'z':-5.75,'w':8.7,'d':6.2,'low':7.06},
    {'id':'front-tools-copper-cassette','x':5.65,'z':-5.75,'w':8.7,'d':6.2,'low':7.06},
    {'id':'rear-inspection-copper-cassette','x':-5.65,'z':2.45,'w':8.7,'d':8.8,'low':7.18},
    {'id':'rear-assembly-tile-cassette','x':5.65,'z':3.15,'w':8.7,'d':10.1,'low':7.18}
]
slope = .66/8.7

def roof_seat(a, end, rotation, length):
    delta = [end[k]-a[k] for k in range(3)]
    n = Vector((-slope, 0, 1)).normalized()  # Blender roof normal
    axis = rotation @ Vector((0,0,1))
    u, v = rotation @ Vector((1,0,0)), rotation @ Vector((0,1,0))
    half_x = .15*abs(u.x)+.17*abs(v.x)
    half_z = .15*abs(u.y)+.17*abs(v.y)
    for roof in roof_modules:
        xmin, xmax = roof['x']-roof['w']/2, roof['x']+roof['w']/2
        zmin, zmax = roof['z']-roof['d']/2, roof['z']+roof['d']/2
        t = (roof['low'] + slope*(a[0]-xmin)-a[1])/(delta[1]-slope*delta[0])
        p = [a[k]+delta[k]*t for k in range(3)]
        if 0 < t < 1 and xmin-half_x < p[0] < xmax+half_x and zmin-half_z < p[2] < zmax+half_z:
            # Cover the full oblique timber/roof seam, not only the centreline.
            half = (.085 + .15*abs(n.dot(u)) + .17*abs(n.dot(v)))/abs(n.dot(axis)) + .06
            low, high = max(0, t*length-half), min(length-.65, t*length+half)
            wall_point = None
            # Contact evidence must lie in a real bronze wall, not the open bore.
            for wx, wy in [(.18,0),(-.18,0),(0,.20),(0,-.20),(.18,.19),(.18,-.19),(-.18,.19),(-.18,-.19)]:
                offset = rotation @ Vector((wx,wy,0))
                distance = (n.dot(blender(p)-blender(a))-n.dot(offset))/n.dot(axis)
                point = runtime(blender(a)+axis*distance+offset)
                if low < distance < high and xmin < point[0] < xmax and zmin < point[2] < zmax:
                    wall_point = point
                    break
            assert wall_point is not None, (a,end,roof['id'])
            return (low+high)/2, high-low, {'roof':roof['id'], 'centerlinePoint':[round(x,6) for x in p],
                'bronzeWallContactPoint':wall_point,
                'distanceAlongStrut':round(t*length,6), 'sleeveIntervalAlongStrut':[round(low,6),round(high,6)],
                'roofThicknessNormal':.17}
    return .38, .44, None

for side, prefix in [(-1,'paper'), (1,'tools')]:
    nodes = {'A':[side*3.3,6.95,-8.3], 'C':[side*3.3,6.95,2.05],
             'I':[side*3.3,6.95,8.3], 'O':[side*8.8,6.95,-3.15],
             'R':[side*8.8,6.95,8.3], 'B':[side*5.4,9.25,-3.15],
             'D':[side*5.5,8.95,8.3]}
    for label in ['B','D']:
        box(prefix+'-'+label+'-fork-node', 'bronze', side,
            'exposed three-way branch junction', nodes[label], [.50,.50,.50], .025)
    for root_label, end_label in [('A','B'),('C','B'),('O','B'),('C','D'),('I','D'),('R','D')]:
        name = prefix+'-'+root_label+'-'+end_label+'-timber'
        a, end = nodes[root_label], nodes[end_label]
        start, tip = blender(a), blender(end)
        direction = tip-start; length = direction.length; unit = direction.normalized()
        rotation = direction.to_track_quat('Z','Y')
        timber = box(name, 'cedar', side, 'exposed forked branch strut',
                     runtime((start+tip)/2), [.30,length,.34], .008)
        timber.rotation_euler = rotation.to_euler()
        lower_center, lower_length, emergence = roof_seat(a,end,rotation,length)
        lower_name, upper_name = name+'-roof-sleeve', name+'-fork-sleeve'
        sleeve(lower_name, side, start+unit*lower_center, rotation, lower_length)
        sleeve(upper_name, side, tip-unit*.38, rotation, .44)
        contact(name, 'original-longitudinal-cedar-rail', a,
                'End seats into the actual x±3.3/±8.8 y6.82–7.12 rail; original rail remains whole')
        contact(name, prefix+'-'+end_label+'-fork-node', end,
                'Strut ends overlap the solid three-way junction')
        for sleeve_name, distance in [(lower_name,lower_center),(upper_name,length-.38)]:
            p = start+unit*distance+(rotation@Vector((.145,0,0)))
            contact(sleeve_name, name, runtime(p), 'Bore has a 0.01 m seat into each timber face')
        if emergence:
            emergence['component'] = lower_name
            emergence['timber'] = name
            penetrations.append(emergence)
            contact(lower_name, emergence['roof'], emergence['bronzeWallContactPoint'],
                    'Sleeve encloses the complete oblique roof emergence; retained cassette is not cut or replaced')
        branches.append({'id':name,'side':side,'from':a,'to':end,'length':round(length,6),
            'localSectionXY':[.30,.34], 'bevel':.008,
            'localBasisRuntimeXYZ':[runtime(rotation@Vector(p)) for p in [(1,0,0),(0,1,0),(0,0,1)]],
            'rootSleeve':{'id':lower_name,'centerDistance':round(lower_center,6),'length':round(lower_length,6)},
            'forkSleeve':{'id':upper_name,'centerDistance':round(length-.38,6),'length':.44}})

# Export actual evaluated solids, plus independently recoverable component ranges.
bpy.context.view_layer.update()
batches, components, all_points = {}, [], []
for obj in parts:
    obj.data.calc_loop_triangles()
    mat = obj.data.materials[0].name
    positions = batches.setdefault(mat, [])
    first, points = len(positions)//9, []
    for tri in obj.data.loop_triangles:
        vertices = [Vector(runtime(obj.matrix_world@obj.data.vertices[i].co)) for i in tri.vertices]
        assert (vertices[1]-vertices[0]).cross(vertices[2]-vertices[0]).length > 1e-9, obj.name
        for vertex in vertices:
            p = [round(value,5) for value in vertex]
            positions.extend(p); points.append(p)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    closed, volume = all(e.is_manifold for e in bm.edges), abs(bm.calc_volume(signed=True))
    euler = len(bm.verts)-len(bm.edges)+len(bm.faces)
    bm.free()
    assert closed and volume > 1e-7 and euler == obj['expected_euler'], (obj.name,euler,volume)
    bounds = {'min':[min(p[i] for p in points) for i in range(3)],
              'max':[max(p[i] for p in points) for i in range(3)]}
    components.append({'id':obj.name,'side':obj['side'],'role':obj['role'],'material':mat,
        'section':'static','firstTriangle':first,'triangleCount':len(positions)//9-first,
        'bounds':bounds,'closedManifold':closed,'eulerCharacteristic':euler,'volumeM3':round(volume,6)})
    all_points.extend(points)
triangles = sum(len(p)//9 for p in batches.values())
assert len(batches)==2 and triangles<2000, triangles
spec = {'buildingIndex':25, 'units':'metres', 'axes':'Three.js x,y-up,z; Blender x,-z,y',
    'interpretation':'Exposed timber forks extend retained branch load paths; bronze through-sleeves make upstream-derived, modular connections inspectable without claiming authorship, reuse rights, or successful builds.',
    'sourceReading':'assets/readings/25.json',
    'reviewedSections':['catalog','brush','tools','research','forks','rights','local'],
    'branchCount':len(branches),'forkNodeCount':4,'sleeveCount':24,'movingComponentsAdded':0,
    'materials':['cedar','bronze'],'strutSection':[.30,.34], 'hubSize':[.50,.50,.50],
    'sleeveOuterSection':[.44,.48],'sleeveInnerSection':[.28,.32],'forkSleeveLength':.44,
    'sleeveTopology':'Watertight rectangular annular tube; connected genus-one solid; Euler characteristic 0',
    'retainedRailCentersX':[-8.8,-3.3,3.3,8.8], 'retainedRailY':[6.82,7.12],
    'retainedRailZ':[-8.525,8.525],'roofModules':roof_modules,'roofRise':.66,
    'branches':branches,'roofEmergences':penetrations,
    'bounds':{'min':[min(p[i] for p in all_points) for i in range(3)],
              'max':[max(p[i] for p in all_points) for i in range(3)]},
    'retention':'Every original roof, flat branch, post, workstation, reading, motion and collision is preserved. Original coupling retains its full 0.46 m stroke. Additions enter only after original finish.',
    'limits':'Architectural interpretation and geometric contacts only, not structural load certification, implementation audit, reuse license or build-success telemetry.'}
data = {'version':1,'source':'Blender closed exposed forked timber space trusses',
    'sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},
    'spec':spec,'components':components,'contacts':contacts}
script = '''/* Generated by tools/model-workshop.py; actual closed Blender solids, including hollow sleeves. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardWorkshopDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='workshop-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='workshop-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Keep original dimensions, reading placement, lamp suspension and collisions.
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
asset = ROOT/'assets/workshop-detail.js'
asset.write_text(script.replace('__DATA__',json.dumps(data,separators=(',',':'))))
report = {'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},
          'assetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),
          'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'workshop-detail.blend'))
print('WORKSHOP_EXPORTED',json.dumps(report['static']),json.dumps(spec['bounds']),report['assetSHA256'])
