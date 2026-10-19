"""Render three views of the exact exported production B20 assembly, CPU only.
Run after docs/moonsnow-detail-check.cjs exports qa-results/moonsnow/runtime-assembly.json:
  /usr/bin/blender -b -t 4 --python tools/render-moonsnow.py
This is geometric/render evidence, not a browser, WebGL, interaction or structural test.
"""
import bpy, json, pathlib, sys, argparse, hashlib, time
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--views', nargs='+', choices=['exterior','court','joint'])
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT/'qa-results/moonsnow'
source = OUT/'runtime-assembly.json'
assembly = json.loads(source.read_text())
assert {'moonsnow-static-cedar','moonsnow-static-bronze'} <= {item['name'] for item in assembly}, 'Export final production assembly before rendering'
asset_source = (ROOT/'assets/moonsnow-detail.js').read_text()
data = json.loads(asset_source.split('const data=',1)[1].split(';\nconst cache=',1)[0])
for material,positions in data['sections']['static']['materials'].items():
    actual = next(item for item in assembly if item['name']=='moonsnow-static-'+material)
    assert len(actual['verts'])*3 == len(positions), 'Export final production triangle batches first'
    for i,vertex in enumerate(actual['verts']):
        runtime_vertex = [vertex[0],vertex[2],-vertex[1]]
        assert all(abs(runtime_vertex[j]-positions[i*3+j])<2e-5 for j in range(3)), 'Stale runtime assembly; re-export final detail before rendering'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
cache = {}
for item in assembly:
    key = tuple(item['color'])+(item['opacity'],item.get('metalness',0),item.get('roughness',.8))
    if key not in cache:
        mat = bpy.data.materials.new('Production material %d'%len(cache))
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = (*item['color'],1)
        shader.inputs['Roughness'].default_value = item.get('roughness') or .8
        shader.inputs['Metallic'].default_value = item.get('metalness') or 0
        if item['opacity'] < 1:
            shader.inputs['Transmission Weight'].default_value = .8
            shader.inputs['Alpha'].default_value = item['opacity']
        cache[key] = mat
    mesh = bpy.data.meshes.new(item['name'] or 'production mesh')
    mesh.from_pydata(item['verts'],[],item['faces']); mesh.update()
    obj = bpy.data.objects.new(item['name'] or 'production instance',mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(cache[key])

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.095))
ground = bpy.context.object; ground.name = 'Presentation-only neutral garden ground'
mat = bpy.data.materials.new('Neutral garden ground'); mat.diffuse_color=(.34,.39,.30,1)
ground.data.materials.append(mat)
world = bpy.data.worlds.new('Presentation-only soft overcast daylight'); world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.70,.77,.85,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.85
bpy.context.scene.world=world
bpy.ops.object.light_add(type='AREA',location=(-11,12,20))
light = bpy.context.object; light.name='External studio daylight, not added to runtime'
light.data.energy=2600; light.data.shape='DISK'; light.data.size=14
light.rotation_euler=(Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(); camera=bpy.context.object
scene=bpy.context.scene; scene.camera=camera
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=32
scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED'; scene.render.threads=4
scene.render.resolution_x=960; scene.render.resolution_y=720; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.compression=100
scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.85
views=[
    {'name':'exterior','position':[-24,30,21],'target':[-.1,-.3,1.6],'lens':44,
     'purpose':'Actual production reading garden with intact moon wall, turning corridor, blank resting court, paired approaches and shared study; stepped eaves follow existing low roof lines'},
    {'name':'court','position':[-7.7,6.1,1.65],'target':[-7.38,-.6,2.85],'lens':25,
     'purpose':'Eye-height view from the actual west visitor route along the turning corridor, showing separately supported stepped eaves while the original garden and uninscribed resting wall remain open'},
    {'name':'joint','position':[.15,-1.7,3.1],'target':[2.46,-4.24,3.31],'lens':48,
     'purpose':'Actual inner study post: hollow bronze saddle and three stepped corbel solids, positive seats into the original post and longitudinal beam, separate eave fascia and lower lip beneath the unchanged roof'}
]
previous_report = OUT/'render-report.json'
rendered = json.loads(previous_report.read_text()).get('rendered',[]) if args.views and previous_report.exists() else []
for view in views:
    if args.views and view['name'] not in args.views: continue
    camera.location=view['position']
    camera.rotation_euler=(Vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=view['lens']
    target=OUT/('blender-'+view['name']+'.png')
    scene.render.filepath=str(target)
    started=time.monotonic(); bpy.ops.render.render(write_still=True)
    rendered = [row for row in rendered if row['view'] != view['name']]
    rendered.append({'view':view['name'],'seconds':round(time.monotonic()-started,3),
        'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
report={'source':'runtime-assembly.json','engine':'Blender Cycles CPU','samples':32,'threads':4,
    'resolution':[960,720],'productionMeshInstances':len(assembly),'views':views,
    'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'assetSHA256':hashlib.sha256((ROOT/'assets/moonsnow-detail.js').read_bytes()).hexdigest(),'pngCompression':100,
    'runtimeDetailVertexVerification':{'vertices':sum(len(v)//3 for v in data['sections']['static']['materials'].values()),'toleranceMetres':.00002,'coordinateMapping':'Blender [x,-z,y] compared to final asset [x,y,z]','passed':True},
    'rendered':rendered,
    'limitations':['Canvas text texture pixels are not baked; independent Canvas/content checks validate reading text.',
        'This does not test browser/WebGL, live navigation, user input, GPU performance or physical construction.',
        'Neutral ground and exterior studio daylight are presentation-only; no runtime lighting was added.']}
(OUT/'render-report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'moonsnow-runtime-assembly.blend'))
print('MOONSNOW_RENDERED',json.dumps(rendered))
