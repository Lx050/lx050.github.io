"""Actual exploration meshes -> neutral CPU Cycles geometry review.
Never browser/WebGL/FPS evidence. Reproduce:
  node docs/exploration-render-export.cjs
  EXPLORATION_CAPTURE=world blender -b -t 6 --python tools/render-exploration.py
  EXPLORATION_CAPTURE=boat blender -b -t 4 --python tools/render-exploration.py
Writes PNGs and source-linked reports under qa-results/exploration/renders/.
"""
import bpy,json,pathlib,os,time,math
from collections import defaultdict
from mathutils import Matrix,Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results/exploration/renders'
CAPTURE=os.environ.get('EXPLORATION_CAPTURE','world')
data=json.loads((OUT/(CAPTURE+'-scene.json')).read_text())
for obj in data['objects']:
 if obj['name']=='single-plane-sea':
  for mid in obj['materials']:
   data['materials'][mid]['color']=[.22,.48,.66]
   data['materials'][mid]['roughness']=.7
   data['materials'][mid]['name']='DISCLOSED OFFLINE OCEAN APPROXIMATION'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for x in list(bpy.data.materials):bpy.data.materials.remove(x)
start=time.time()
# Bake source matrixWorld and instance matrices into material batches. This does not
# simplify, relocate or replace a triangle. Sharing is lost, authored geometry is not.
convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
batches={}
mat_sources=data['materials']
for oi,obj in enumerate(data['objects']):
 g=data['geometries'][obj['geometry']];a=obj['matrix']
 mat=Matrix(tuple(tuple(a[c*4+r] for c in range(4)) for r in range(4)))
 mat=convert@mat
 winding=(0,2,1) if mat.determinant()<0 else (0,1,2)
 vv=[tuple(mat@Vector(v)) for v in g['verts']]
 indices=g['indices'];groups=g['groups'] or [{'start':0,'count':len(indices),'materialIndex':0}]
 for group in groups:
  mid=obj['materials'][min(group['materialIndex'],len(obj['materials'])-1)]
  # Source InstancedMesh per-instance colour is part of authored geometry appearance.
  tint=tuple(obj['instanceColor']) if obj['instanceColor'] else (1,1,1)
  key=mid
  if key not in batches:batches[key]={'verts':[],'faces':[],'colors':[],'names':set()}
  b=batches[key];offset=len(b['verts']);b['verts'].extend(vv)
  source=mat_sources[mid];base=source['color'];vc=g.get('color') if source['vertexColors'] else None
  for vi in range(len(vv)):
   b['colors'].extend([base[k]*tint[k]*(vc[vi*3+k] if vc else 1) for k in range(3)]+[1])
  end=min(group['start']+group['count'],len(indices))
  b['faces'].extend(tuple(offset+indices[i+j] for j in winding) for i in range(group['start'],end-2,3))
  b['names'].add(obj['name'])
 if oi%10000==0:print('Baking exact transforms',oi,'/',len(data['objects']),flush=True)
for bi,(mid,batch) in enumerate(batches.items()):
 src=mat_sources[mid]
 mesh=bpy.data.meshes.new('exact-host-batch-%03d'%bi)
 mesh.from_pydata(batch['verts'],[],batch['faces']);mesh.update()
 obj=bpy.data.objects.new('exact-host-batch-%03d'%bi,mesh);bpy.context.collection.objects.link(obj)
 obj['source_mesh_names']=' | '.join(sorted(batch['names']))[:10000]
 m=bpy.data.materials.new(src['name']+'-'+str(bi));m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 color=tuple(src['color'])
 p.inputs['Base Color'].default_value=(*color,1)
 ca=mesh.color_attributes.new(name='Source linear color',type='FLOAT_COLOR',domain='POINT');ca.data.foreach_set('color',batch['colors'])
 attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Source linear color';m.node_tree.links.new(attr.outputs['Color'],p.inputs['Base Color'])
 p.inputs['Metallic'].default_value=max(0,min(1,src['metalness']))
 p.inputs['Roughness'].default_value=max(.12,min(1,src['roughness']))
 p.inputs['Emission Color'].default_value=(*src['emissive'],1)
 p.inputs['Emission Strength'].default_value=min(src['emissiveIntensity'],2)
 # Glass sheets retain geometry but are approximated using source scalar alpha only.
 # No CanvasTexture pixels or browser material shader are invented.
 if src['transparent'] and src['opacity']<1:
  p.inputs['Alpha'].default_value=src['opacity']
  m.surface_render_method='DITHERED'
 # Cycles otherwise shades both sides even when Three uses FrontSide.
 side=src.get('side',0)
 if side!=2:
  nodes=m.node_tree.nodes;links=m.node_tree.links;output=nodes.get('Material Output')
  geo=nodes.new('ShaderNodeNewGeometry');transparent=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader')
  links.new(geo.outputs['Backfacing'],mix.inputs[0])
  links.new(p.outputs['BSDF'],mix.inputs[1 if side==0 else 2]);links.new(transparent.outputs[0],mix.inputs[2 if side==0 else 1]);links.new(mix.outputs[0],output.inputs['Surface'])
 mesh.materials.append(m)
 if not src['flatShading']:
  for f in mesh.polygons:f.use_smooth=True
print('Exact triangles imported; batches',len(batches),'seconds',round(time.time()-start,1),flush=True)
del batches;del data['objects'];del data['geometries']
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=int(os.environ.get('EXPLORATION_SAMPLES','16'))
scene.cycles.use_denoising=False;scene.cycles.max_bounces=5;scene.cycles.diffuse_bounces=3;scene.cycles.glossy_bounces=3;scene.cycles.transparent_max_bounces=8
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(.42,.61,.74,1);bg.inputs['Strength'].default_value=.65
# Neutral warm side light gives roof/wall section depth without pretending to match WebGL.
bpy.ops.object.light_add(type='SUN',location=(-140,-200,250));sun=bpy.context.object;sun.data.energy=2.0;sun.data.angle=math.radians(16);sun.rotation_euler=(math.radians(28),math.radians(-25),math.radians(-35))
bpy.ops.object.light_add(type='AREA',location=(40,120,300));fill=bpy.context.object;fill.data.energy=170000;fill.data.shape='DISK';fill.data.size=250;fill.rotation_euler=(Vector((40,80,0))-fill.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.2
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.clip_end=15000

# Deliberate inspection cameras are exported from actual geography/building frames.
views=data['report']['views']; selected=os.environ.get('EXPLORATION_VIEWS')
if selected:views=[v for v in views if v['name'] in selected.split(',')]
import subprocess
annotation_script=r'''import sys,json
from PIL import Image,ImageDraw,ImageFont
p,v=sys.argv[1],json.loads(sys.argv[2]);im=Image.open(p).convert('RGB');w,h=im.size
canvas=Image.new('RGB',(w,h+136),'#e8eff0');canvas.paste(im,(0,76));d=ImageDraw.Draw(canvas)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
d.text((24,12),v['title'],font=ImageFont.truetype(bold,24),fill='#1c353e')
d.text((24,46),'OFFLINE CPU GEOMETRY REVIEW  |  NOT PRODUCTION BROWSER / WEBGL / FPS',font=ImageFont.truetype(bold,16),fill='#46616c')
d.text((24,h+88),v['note'],font=ImageFont.truetype(font,16),fill='#294b55')
d.text((24,h+112),'Material, texture, shader and lighting approximations. Light-blue review ocean. All roots visible; distance LOD disabled.',font=ImageFont.truetype(font,14),fill='#526a73')

for text,face,size in [(v['title'],bold,24),('OFFLINE CPU GEOMETRY REVIEW  |  NOT PRODUCTION BROWSER / WEBGL / FPS',bold,16),(v['note'],font,16),('Material, texture, shader and lighting approximations. Light-blue review ocean. All roots visible; distance LOD disabled.',font,14)]:
 assert d.textlength(text,font=ImageFont.truetype(face,size))<=w-48, 'Caption would clip: '+text
canvas.save(p)
'''
reports=[]
for view in views:
 if view['name']=='rss-boat-shore': view={**view,'scale':48}
 camera.location=Vector(view['position'])+(Vector(view['position'])-Vector(view['target'])).normalized()*1000;camera.rotation_euler=(Vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=view['scale']
 w,h=view['ratio'];scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.resolution_percentage=100
 output=OUT/(view['name']+'-cpu.png');scene.render.filepath=str(output)
 t=time.time();bpy.ops.render.render(write_still=True)
 subprocess.run(['python','-c',annotation_script,str(output),json.dumps(view)],check=True)
 reports.append({**view,'renderCameraPosition':list(camera.location),'file':str(output.relative_to(ROOT)),'resolution':[w,h+136],'seconds':round(time.time()-t,2)})
 report={'engine':'Blender '+bpy.app.version_string+' CPU Cycles','samples':scene.cycles.samples,'denoising':scene.cycles.use_denoising,'source':str(OUT/(CAPTURE+'-scene.json')),'sourceHashes':data['report']['sourceHashes'],'sceneFingerprint':data['report']['sceneFingerprint'],'triangles':data['report']['triangles'],'geometryCoverage':data['report']['coverage'],'limitations':data['report']['limitations'],'views':reports,'elapsedSeconds':round(time.time()-start,2)}
 (OUT/(CAPTURE+'-render-report.json')).write_text(json.dumps(report,indent=2))
 print('READY',str(output),'seconds',reports[-1]['seconds'],flush=True)
