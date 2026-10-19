"""Render three views of exact exported production B12 mesh assembly with Blender CPU.
Run after docs/reme-detail-check.cjs exports qa-results/reme/runtime-assembly.json.
This is geometry evidence, not browser/WebGL proof. Canvas text pixels are not baked.
"""
import bpy, json, pathlib, sys, argparse, hashlib
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--views', nargs='+', choices=['exterior','court','threshold'])
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-results/reme'
source = OUT / 'runtime-assembly.json'
assembly = json.loads(source.read_text())
assert {'reme-static-oak', 'reme-static-cedar'} <= {item['name'] for item in assembly}, 'Export final assembly before rendering'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
cache = {}
for item in assembly:
    key = tuple(item['color']) + (item['opacity'], item.get('metalness', 0), item.get('roughness', .8))
    if key not in cache:
        material = bpy.data.materials.new('Production material %d' % len(cache))
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = (*item['color'], 1)
        shader.inputs['Roughness'].default_value = item.get('roughness') or .8
        shader.inputs['Metallic'].default_value = item.get('metalness') or 0
        if item['opacity'] < 1:
            shader.inputs['Transmission Weight'].default_value = .8
            shader.inputs['Alpha'].default_value = item['opacity']
        cache[key] = material
    mesh = bpy.data.meshes.new(item['name'] or 'production mesh')
    mesh.from_pydata(item['verts'], [], item['faces'])
    mesh.update()
    obj = bpy.data.objects.new(item['name'] or 'production instance', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(cache[key])

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.095))
material = bpy.data.materials.new('Neutral garden presentation ground')
material.diffuse_color = (.34, .39, .30, 1)
bpy.context.object.data.materials.append(material)
world = bpy.data.worlds.new('Soft overcast presentation daylight')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.70, .77, .85, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .85
bpy.context.scene.world = world
bpy.ops.object.light_add(type='AREA', location=(-10, 12, 19))
light = bpy.context.object
light.name = 'External presentation daylight only'
light.data.energy = 2400
light.data.shape = 'DISK'
light.data.size = 14
light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 40
scene.cycles.use_denoising = False
scene.render.resolution_x = 1120
scene.render.resolution_y = 840
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.compression = 100
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = .85
views = [
    {'name':'exterior', 'position':[23,28,17], 'target':[0,0,3.8], 'lens':44,
     'purpose':'Two compact separate hoods retain the original two domestic roof silhouettes'},
    {'name':'court', 'position':[0,8.2,1.72], 'target':[0,-.5,4.65], 'lens':18,
     'purpose':'Eye-height open court, separate home/family sides, original screened event windows'},
    {'name':'threshold', 'position':[9.2,11.5,11.5], 'target':[3.05,0,6.15], 'lens':52,
     'purpose':'Foldback shell, original-roof heel and pitched saddles with post/knee support'}
]
for view in views:
    if args.views and view['name'] not in args.views:
        continue
    camera.location = view['position']
    camera.rotation_euler = (Vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens = view['lens']
    scene.render.filepath = str(OUT / ('blender-'+view['name']+'.png'))
    bpy.ops.render.render(write_still=True)
(OUT/'render-report.json').write_text(json.dumps({
    'source':'runtime-assembly.json', 'engine':'Blender Cycles CPU', 'samples':40,
    'resolution':[1120,840], 'productionMeshInstances':len(assembly), 'views':views,
    'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(), 'pngCompression':100,
    'limitations':['Canvas text texture pixels are not baked; use independent Canvas/content checks for text.',
                   'Not browser/WebGL, user input, GPU, or physical construction proof.',
                   'Ground and exterior studio daylight are presentation-only; no runtime lights added.']
},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'reme-runtime-assembly.blend'))
