"""Road-specific actual-geometry, CPU Cycles visual comparison.

  MASTERPLAN_OUT=qa-results/roads/before node docs/roads-render-export.cjs
  ROADS_OUT=qa-results/roads/before blender -b -t 6 --python tools/render-roads.py
  ROADS_OUT=... ROADS_VIEWS=whole-layout,eye-east-spine ROADS_SAMPLES=16 ROADS_WIDTH=1200

Baseline and candidate use identical road-camera-plan.json. Source triangle transforms,
materials and local GLBs are imported exactly as in render-masterplan.py; lighting and
shaders are a documented offline approximation, not browser/WebGL evidence.
"""
import bpy,json,pathlib,os,time,math
from collections import defaultdict
from mathutils import Matrix,Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path(os.environ.get('ROADS_OUT',str(ROOT/'qa-results/roads/after'))).resolve()
data=json.loads((OUT/'scene.json').read_text())
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
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=int(os.environ.get('ROADS_SAMPLES','16'))
scene.cycles.use_denoising=False;scene.cycles.max_bounces=5;scene.cycles.diffuse_bounces=3;scene.cycles.glossy_bounces=3;scene.cycles.transparent_max_bounces=8
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(.20,.27,.33,1);bg.inputs['Strength'].default_value=.7
# Neutral warm side light gives roof/wall section depth without pretending to match WebGL.
bpy.ops.object.light_add(type='SUN',location=(-140,-200,250));sun=bpy.context.object;sun.data.energy=2.8;sun.data.angle=math.radians(16);sun.rotation_euler=(math.radians(28),math.radians(-25),math.radians(-35))
bpy.ops.object.light_add(type='AREA',location=(40,120,300));fill=bpy.context.object;fill.data.energy=170000;fill.data.shape='DISK';fill.data.size=250;fill.rotation_euler=(Vector((40,80,0))-fill.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.8
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.clip_end=3000
# These views use measured host coordinates (x,-z,y). Three.js north (-Z) is image up
# in the plan. A 3-D plan rather than painted diagram keeps roofs and routes measurable.
camera_plan=json.loads((OUT/'road-camera-plan.json').read_text())
views=camera_plan['views']
selected=os.environ.get('ROADS_VIEWS')
if selected:
 requested=set(selected.split(','));available={v['name'] for v in views}
 if requested-available:raise ValueError('Unknown road views: '+', '.join(sorted(requested-available)))
 views=[v for v in views if v['name'] in requested]
width_override=int(os.environ.get('ROADS_WIDTH','1200'))
# Text is explicitly explanatory annotation, camera-parented, never asserted to be
# production text. It identifies evidence type on every image.
overlay=bpy.data.collections.new('OFFLINE ANNOTATION');scene.collection.children.link(overlay)
def label(text,x,y,size,color=(.87,.91,.91,1)):
 curve=bpy.data.curves.new('offline annotation','FONT');curve.body=text;curve.size=size;curve.extrude=0;curve.align_x='LEFT'
 ob=bpy.data.objects.new(text,curve);overlay.objects.link(ob);ob.parent=camera;ob.location=(x,y,-2);ob.visible_shadow=False;ob.visible_diffuse=False;ob.visible_glossy=False;ob.visible_transmission=False
 m=bpy.data.materials.new('annotation');m.use_nodes=True;nodes=m.node_tree.nodes;nodes.clear();p=nodes.new('ShaderNodeEmission');p.inputs['Color'].default_value=color;p.inputs['Strength'].default_value=1;out=nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(p.outputs[0],out.inputs['Surface']);curve.materials.append(m)
 return ob
reports=[]
for view in views:
 for obj in list(overlay.objects):bpy.data.objects.remove(obj,do_unlink=True)
 camera.location=view['position'];camera.rotation_euler=(Vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type=view.get('type','ORTHO')
 if camera.data.type=='ORTHO':camera.data.ortho_scale=view['scale']
 else:camera.data.lens=view.get('lens',24);camera.data.sensor_fit='HORIZONTAL'
 w,h=view['ratio'];
 if width_override:h=round(h*width_override/w);w=width_override
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.resolution_percentage=100
 # In Blender ortho_scale is width for landscape/square images.
 cw=view['scale'] if camera.data.type=='ORTHO' else 4*math.tan(camera.data.angle_x/2);ch=cw*h/w
 label(view['title'],-cw*.47,ch*.452,cw*.012)
 label('EXACT HOST GEOMETRY  /  CPU CYCLES  /  MATERIAL APPROXIMATION',-cw*.47,ch*.42,cw*.0068,(.57,.69,.72,1))
 label(view['note'],-cw*.47,-ch*.465,cw*.007,(.7,.78,.8,1))
 output=OUT/(view['name']+'-cycles.png');scene.render.filepath=str(output)
 t=time.time();bpy.ops.render.render(write_still=True)
 reports.append({**view,'file':str(output.relative_to(ROOT)),'resolution':[w,h],'seconds':round(time.time()-t,2)})
 print('Rendered',view['name'],reports[-1]['seconds'],'seconds',flush=True)
report={'engine':'Blender '+bpy.app.version_string+' CPU Cycles','samples':scene.cycles.samples,'denoising':scene.cycles.use_denoising,'source':str((OUT/'scene.json').relative_to(ROOT)), 'cameraPlan':camera_plan,'sourceHashes':data['report']['sourceHashes'],'sceneFingerprint':data['report'].get('sceneFingerprint'),'triangles':data['report']['triangles'],'geometryCoverage':data['report']['coverage'],'limitations':data['report']['limitations'],'views':reports,'elapsedSeconds':round(time.time()-start,2)}
(OUT/'road-render-report.json').write_text(json.dumps(report,indent=2))
print('Rendered all requested exact-geometry views:',OUT,flush=True)
