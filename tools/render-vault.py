"""Render three views of the exact exported production B9 assembly, CPU only.
Run after docs/vault-detail-check.cjs exports qa-results/vault/runtime-assembly.json:
  /usr/bin/blender -b -t 4 --python tools/render-vault.py
This is geometric/render evidence, not a browser, WebGL, interaction or structural test.
"""
import bpy, json, pathlib, sys, argparse, hashlib, time, subprocess
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--views', nargs='+', choices=['exterior','court','joint'])
parser.add_argument('--compress-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT/'qa-results/vault'
source = OUT/'runtime-assembly.json'
assembly = json.loads(source.read_text())
assert {'vault-static-limestone','vault-static-bronze'} <= {item['name'] for item in assembly}, 'Export final production assembly before rendering'
asset_source = (ROOT/'assets/vault-detail.js').read_text()
data = json.loads(asset_source.split('const data=',1)[1].split(';\nconst cache=',1)[0])
for material,positions in data['sections']['static']['materials'].items():
    actual = next(item for item in assembly if item['name']=='vault-static-'+material)
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
# Presentation-only broad interior fill, deliberately absent from the runtime.
# This Blender build has no OpenImageDenoise support; direct soft fill makes
# the measured arch and wheel seats readable at the required32 CPU samples.
bpy.ops.object.light_add(type='AREA',location=(0,2,3.1))
fill=bpy.context.object;fill.name='Presentation-only interior inspection fill'
fill.data.energy=220;fill.data.shape='DISK';fill.data.size=4.5
fill.rotation_euler=(Vector((0,-4,5.0))-fill.location).to_track_quat('-Z','Y').to_euler()
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
    {'name':'exterior','position':[-18,25,8.5],'target':[0,0,4.6],'lens':40,
     'purpose':'Original Vaultwarden pavilion: three deep stepped limestone archivolts beneath the retained copper barrel, seated feet and static rear support for the unchanged side-parked wheel'},
    {'name':'court','position':[0,-4.4,1.65],'target':[0,7.0,5.0],'lens':20,
     'purpose':'Eye-height view toward the open entrance from the original central passage; the preserved shell, cabinets and parked wheel remain generic existing architecture, with no authenticated-product claims'},
    {'name':'joint','position':[-9.8,12.4,5.35],'target':[-6.60,7.4,5.1],'lens':55,
     'purpose':'Actual front-left steel post, through-bored bronze collars, stepped stone arch-foot and compact bronze rear parking corbel seated into the original wheel'}
]
previous_report = OUT/'render-report.json'
rendered = json.loads(previous_report.read_text()).get('rendered',[]) if (args.views or args.compress_only) and previous_report.exists() else []
for view in views:
    if args.compress_only or (args.views and view['name'] not in args.views): continue
    scene.view_settings.exposure={'exterior':.85,'court':.9,'joint':1.0}[view['name']]
    fill.hide_render=view['name']=='exterior'
    fill.location=[-8.5,10.0,6.5] if view['name']=='joint' else [0,0,5.3]
    fill_target=Vector([-6.60,7.4,5.1] if view['name']=='joint' else [0,7.0,6.5])
    fill.rotation_euler=(fill_target-fill.location).to_track_quat('-Z','Y').to_euler()
    camera.location=view['position']
    camera.rotation_euler=(Vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=view['lens']
    target=OUT/('blender-'+view['name']+'.png')
    scene.render.filepath=str(target)
    started=time.monotonic(); bpy.ops.render.render(write_still=True)
    rendered = [row for row in rendered if row['view'] != view['name']]
    rendered.append({'view':view['name'],'seconds':round(time.monotonic()-started,3),
        'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
# Compression changes only palette representation, never mesh, camera or render pixels.
preview_dir=ROOT/'docs/previews';preview_dir.mkdir(parents=True,exist_ok=True)
previews=[]
for view in views:
    full=OUT/('blender-'+view['name']+'.png');preview=preview_dir/('vault-'+view['name']+'.png')
    if not full.exists(): continue
    subprocess.run(['python','-c',"from PIL import Image;import sys;im=Image.open(sys.argv[1]).convert('RGB');im.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).save(sys.argv[2],optimize=True,compress_level=9)",str(full),str(preview)],check=True)
    previews.append({'view':view['name'],'path':str(preview.relative_to(ROOT)),'sha256':hashlib.sha256(preview.read_bytes()).hexdigest(),'bytes':preview.stat().st_size,'paletteColors':256,'compression':'Pillow adaptive median-cut palette, no dithering; no recoloring or geometry edits','fullResolutionPath':str(full.relative_to(ROOT)),'fullSHA256':hashlib.sha256(full.read_bytes()).hexdigest()})
report={'source':'runtime-assembly.json' ,'engine':'Blender Cycles CPU','samples':32,'threads':4,'denoising':False,
    'presentationExposure':{'exterior':.85,'court':.9,'joint':1.0},
    'presentationInteriorFill':{'type':'AREA DISK','positionsByView':{'court':[0,0,5.3],'joint':[-8.5,10.0,6.5]},'targetsByView':{'court':[0,7.0,6.5],'joint':[-6.60,7.4,5.1]},'energy':220,'size':4.5,'views':['court','joint'],'runtimeLightAdded':False},
    'resolution':[960,720],'productionMeshInstances':len(assembly),'views':views,
    'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'assetSHA256':hashlib.sha256((ROOT/'assets/vault-detail.js').read_bytes()).hexdigest(),'pngCompression':100,
    'runtimeDetailVertexVerification':{'vertices':sum(len(v)//3 for v in data['sections']['static']['materials'].values()),'toleranceMetres':.00002,'coordinateMapping':'Blender [x,-z,y] compared to final asset [x,y,z]','passed':True},
    'rendered':rendered,'previews':previews,
    'modelSourceSHA256':hashlib.sha256((ROOT/'tools/model-vault.py').read_bytes()).hexdigest(),
    'rendererSourceSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
    'limitations':['Canvas text texture pixels are not baked; independent Canvas/content checks validate reading text.',
        'This does not test browser/WebGL, live navigation, user input, GPU performance or physical construction.',
        'Neutral ground, exterior daylight and broad interior inspection fill are presentation-only; no runtime lighting was added. OpenImageDenoise is unavailable in the installed Blender build; previews retain the required32-sample CPU result.']}
(OUT/'render-report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'vault-runtime-assembly.blend'))
print('VAULT_RENDERED',json.dumps(rendered))
