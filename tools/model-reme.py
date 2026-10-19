"""Author the two Reme privacy hoods as actual, separately recoverable Blender solids.
Run: /usr/bin/blender -b -t 2 --python tools/model-reme.py
Metres, Three.js (x, y-up, z) -> Blender (x, -z, y). No sources or media fetched.
"""
import bpy, bmesh, json, math, pathlib
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-results/reme'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
materials = {}
for key, color in {'oak': '9c8c72', 'cedar': '786b55'}.items():
    material = bpy.data.materials.new(key)
    material.diffuse_color = (*[int(color[i:i+2], 16) / 255 for i in (0, 2, 4)], 1)
    materials[key] = material
parts = []

# Positive x half. The other home has its own mirrored hood, never a shared roof.
# The heel is embedded 4–6 cm into the original inner roof slope, whose centreline
# is y = 4.97 + (abs(x) - 2.35) * (2.25 / 3.65). The old roof is never cut.
HOOD_PROFILE = [
    [4.55, 6.28], [4.48, 7.00], [3.98, 7.83], [3.55, 8.18],
    [2.18, 8.18], [2.00, 8.00], [2.00, 7.62], [2.22, 7.62],
    [2.22, 7.92], [3.46, 7.92], [3.80, 7.65], [4.24, 6.92],
    [4.27, 6.10]
]
RIB_PROFILE = [
    [4.61, 6.28], [4.54, 7.02], [4.03, 7.88], [3.57, 8.24],
    [2.15, 8.24], [1.94, 8.02], [1.94, 7.57], [2.28, 7.57],
    [2.28, 7.86], [3.44, 7.86], [3.75, 7.60], [4.18, 6.90],
    [4.21, 6.10]
]
contacts = []

def register(obj, part_id, side, role):
    obj.name = part_id
    obj['component_id'] = part_id
    obj['home_side'] = side
    obj['role'] = role
    obj['runtime_section'] = 'static'
    parts.append(obj)
    return obj

def box(part_id, mat, side, role, center, size, bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(center[0], -center[2], center[1]))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(materials[mat])
    if bevel:
        modifier = obj.modifiers.new('Softened domestic timber arris', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return register(obj, part_id, side, role)

def beam(part_id, mat, side, role, a, b, width=.18, depth=.20):
    start = Vector((a[0], -a[2], a[1]))
    end = Vector((b[0], -b[2], b[1]))
    mid = (start + end) / 2
    obj = box(part_id, mat, side, role, (mid.x, mid.z, -mid.y),
              (width, (end-start).length, depth), .009)
    obj.rotation_euler = (end-start).to_track_quat('Z', 'Y').to_euler()
    return obj

def profile_solid(part_id, mat, side, role, profile, zmin, zmax, bevel=0):
    count = len(profile)
    vertices = [(side*x, -z, y) for z in [zmin, zmax] for x, y in profile]
    faces = [tuple(range(count-1, -1, -1)), tuple(range(count, 2*count))]
    faces += [(i, (i+1)%count, (i+1)%count+count, i+count) for i in range(count)]
    mesh = bpy.data.meshes.new(part_id + '-closed-mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(part_id, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(materials[mat])
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    if bevel:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new('Softened foldback edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return register(obj, part_id, side, role)

def contact(component, target, point, purpose):
    contacts.append({'component': component, 'target': target, 'point': point,
                     'purpose': purpose, 'type': 'intentional material overlap'})

for side, prefix in [(-1, 'home'), (1, 'family')]:
    hood = prefix + '-foldback-hood'
    profile_solid(hood, 'oak', side, 'continuous closed protective hood', HOOD_PROFILE, -3.3, 3.3)
    contact(hood, 'original-inner-tile-roof', [side*4.40, 6.25, 0],
            'Continuous pitched heel seats into the retained roof skin')
    for end, z in [('front', -3.325), ('rear', 3.325)]:
        rib = prefix + '-' + end + '-fold-rib'
        profile_solid(rib, 'cedar', side, 'closed folded end binding', RIB_PROFILE, z-.125, z+.125)
        contact(rib, hood, [side*3.1, 8.04, math.copysign(3.25, z)],
                'End binding overlaps the oak shell by 0.10 m along z')
    # One offset interior baffle below each turned lip, not a new event shutter.
    baffle = prefix + '-inner-privacy-baffle'
    box(baffle, 'cedar', side, 'second static shelter layer', (side*2.43, 7.47, 0), (.14, .28, 5.94))
    for end, z in [('front', -2.4), ('rear', 2.4)]:
        stem = prefix + '-' + end
        post = stem + '-post-extension'
        cap = stem + '-head-bearing'
        brace = stem + '-outer-knee'
        collar = stem + '-roof-saddle'
        hanger = stem + '-baffle-hanger'
        box(post, 'oak', side, 'extension of retained inner post',
            (side*3.1, 6.39, z), (.22, 3.18, .24))  # exact y4.80–7.98
        box(cap, 'cedar', side, 'bearing against hood underside',
            (side*3.1, 7.94, z), (.48, .20, .38))
        beam(brace, 'oak', side, 'triangulated hood support',
             (side*3.1, 6.72, z), (side*4.05, 7.40, z), .18, .22)
        # A sloping closed block, rather than a horizontal float above the roof.
        slope = 2.25/3.65
        roof = lambda x: 4.97 + (x-2.35)*slope
        collar_profile = [[2.78, roof(2.78)-.03], [3.42, roof(3.42)-.03],
                          [3.42, roof(3.42)+.20], [2.78, roof(2.78)+.20]]
        profile_solid(collar, 'cedar', side, 'pitched roof penetration saddle',
                      collar_profile, z-.28, z+.28)
        box(hanger, 'cedar', side, 'baffle tenon into hood soffit',
            (side*2.43, 7.73, z), (.12, .54, .14), .008)
        contact(post, 'original-inner-oak-post-and-longitudinal-rail',
                [side*3.1, 4.85, z], '0.10 m seat inside the original y4.60–4.90 rail')
        contact(cap, post, [side*3.1, 7.94, z], 'Post tenons into the head bearing')
        contact(cap, hood, [side*3.1, 7.98, z], 'Bearing overlaps the hood underside y7.92')
        contact(brace, post, [side*3.13, 6.74, z], 'Brace lower end bears into post')
        contact(brace, hood, [side*4.05, 7.40, z], 'Brace upper end enters the folded shell')
        contact(collar, 'original-inner-tile-roof', [side*3.1, roof(3.1)+.05, z],
                'Pitched saddle encloses intentional post penetration without changing original roof')
        contact(collar, post, [side*3.1, roof(3.1)+.10, z], 'Saddle embraces the post')
        contact(hanger, hood, [side*2.43, 7.97, z], 'Baffle hanger has a 0.08 m soffit tenon')
        contact(hanger, baffle, [side*2.43, 7.51, z], 'Baffle hanger overlaps the baffle by 0.15 m')

# Export actual evaluated triangle coordinates, preserving a component directory
# so each independently closed object can be recovered from the two draw batches.
bpy.context.view_layer.update()
batches = {}
components = []
all_points = []
for obj in parts:
    obj.data.calc_loop_triangles()
    mat = obj.data.materials[0].name
    positions = batches.setdefault(mat, [])
    first = len(positions)//9
    points = []
    for tri in obj.data.loop_triangles:
        vertices = []
        for index in tri.vertices:
            v = obj.matrix_world @ obj.data.vertices[index].co
            vertices.append(Vector((round(v.x, 5), round(v.z, 5), round(-v.y, 5))))
        assert (vertices[1]-vertices[0]).cross(vertices[2]-vertices[0]).length > 1e-9, obj.name
        for vertex in vertices:
            points.append(list(vertex))
            positions.extend(round(value, 5) for value in vertex)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    closed = all(edge.is_manifold for edge in bm.edges)
    volume = abs(bm.calc_volume(signed=True))
    bm.free()
    assert closed and volume > 1e-6, obj.name
    bounds = {'min': [round(min(p[i] for p in points), 5) for i in range(3)],
              'max': [round(max(p[i] for p in points), 5) for i in range(3)]}
    components.append({'id': obj.name, 'side': obj['home_side'], 'role': obj['role'],
                       'material': mat, 'section': 'static', 'firstTriangle': first,
                       'triangleCount': len(positions)//9-first, 'bounds': bounds,
                       'closedManifold': closed, 'volumeM3': round(volume, 6)})
    all_points.extend(points)
triangles = sum(len(p)//9 for p in batches.values())
assert len(batches) == 2 and triangles < 4000
spec = {
    'buildingIndex': 12,
    'units': 'metres', 'axes': 'Three.js x,y-up,z; Blender x,-z,y',
    'interpretation': 'Two separate domestic hoods protect anonymous event windows; layered static shielding does not imply authenticated family access or real collection.',
    'sourceReading': 'assets/readings/12.json',
    'reviewedSections': ['two-ends','permissions','events','privacy','local-demo','boundary'],
    'hoodCount': 2, 'movingComponentsAdded': 0, 'materials': ['oak','cedar'],
    'hoodProfilePositiveXY': HOOD_PROFILE, 'ribProfilePositiveXY': RIB_PROFILE,
    'hoodZ': [-3.3,3.3], 'endRibZ': [[-3.45,-3.2],[3.2,3.45]],
    'postCentersXZ': [[s*3.1,z] for s in [-1,1] for z in [-2.4,2.4]],
    'postY': [4.8,7.98], 'postSectionXZ': [.22,.24],
    'headBearingSizeXYZ': [.48,.20,.38],
    'roofCentrelineEquation': 'y=4.97+(abs(x)-2.35)*(2.25/3.65)',
    'roofSaddleAbsX': [2.78,3.42], 'roofSaddleLocalZ': [-.28,.28],
    'roofSaddleVerticalOffsetsFromCentreline': [-.03,.20],
    'baffleCentersXYZ': [[s*2.43,7.47,0] for s in [-1,1]],
    'baffleSizeXYZ': [.14,.28,5.94],
    'centreSkyGapAtHoodLevel': 3.88,
    'bounds': {'min':[round(min(p[i] for p in all_points),5) for i in range(3)],
               'max':[round(max(p[i] for p in all_points),5) for i in range(3)]},
    'retention': 'Original roofs, anonymous rod displays, windows, layered privacy walls, routes, furniture, signs, reader and motion stay unchanged; additions attach only after original finish.',
    'limits': 'Artistic joinery and geometric contact only; no engineering load certification, authenticated privacy claim, sensors, live status, camera or microphone access.'
}
data = {'version':1, 'source':'Blender closed dual domestic privacy hoods',
        'sections':{'static':{'parts':len(parts),'triangles':triangles,'materials':batches}},
        'spec':spec, 'components':components, 'contacts':contacts}
script = '''/* Generated by tools/model-reme.py using Blender; geometry is authored as closed solids. */
(function(g){
'use strict';
const data=__DATA__;
const cache=new WeakMap();
g.CourtyardRemeDetail={data,attach(b){
  let cached=cache.get(b.T);if(!cached){cached={};cache.set(b.T,cached);}
  const group=new b.T.Group();group.name='reme-blender-static';
  for(const [material,positions] of Object.entries(data.sections.static.materials)){
    let geometry=cached[material];
    if(!geometry){geometry=new b.T.BufferGeometry();geometry.setAttribute('position',new b.T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();cached[material]=geometry;}
    const mesh=new b.T.Mesh(geometry,b.M[material]);mesh.name='reme-static-'+material;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  // Finish the unmodified building first. Existing dimensions, light suspension,
  // collision records and reading placement must not be driven by the new hoods.
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
(ROOT/'assets/reme-detail.js').write_text(script.replace('__DATA__', json.dumps(data,separators=(',',':'))))
report = {'static':{'parts':len(parts),'triangles':triangles,'materialBatches':len(batches)},
          'spec':spec,'components':components,'contacts':contacts}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'reme-detail.blend'))
print('REME_EXPORTED', json.dumps(report['static']), json.dumps(spec['bounds']))
