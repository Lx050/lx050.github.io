"""Offline CPU geometry review; does not validate WebGL or browser interaction."""
import bpy,json,pathlib,os
physical=os.environ.get("BFLY_MATERIALS")=="1"
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[1];out=root/'qa-results/butterfly'
for label in ['down','up']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 cache={}
 for item in json.loads((out/(label+'.json')).read_text()):
  key=tuple(item['color'])+tuple(item.get('emissive',[0,0,0]))+(item.get('emissiveIntensity',0),)
  if key not in cache:
   m=bpy.data.materials.new('runtime color');m.diffuse_color=(*item['color'],1)
   if physical:
    m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*item['color'],1);p.inputs['Metallic'].default_value=item.get('metalness') or 0;p.inputs['Roughness'].default_value=item.get('roughness') or .8;p.inputs['Emission Color'].default_value=(*item.get('emissive',[0,0,0]),1);p.inputs['Emission Strength'].default_value=item.get('emissiveIntensity',0)
   cache[key]=m
  mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(item['verts'],[],item['faces']);mesh.update();o=bpy.data.objects.new(item['name'],mesh);bpy.context.collection.objects.link(o);o.data.materials.append(cache[key])
 bpy.ops.object.camera_add(location=(115,-150,90));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,31))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=165
 scene=bpy.context.scene;scene.camera=cam;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD';scene.world.color=(.13,.18,.2);scene.render.resolution_x=1280;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.filepath=str(out/(label+'.png'))
 if physical:
  scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.render.resolution_x=1000;scene.render.resolution_y=820
  scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.31,.39,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
  bpy.ops.object.light_add(type='AREA',location=(0,-45,130));light=bpy.context.object;light.data.energy=120000;light.data.shape='DISK';light.data.size=90;light.rotation_euler=(Vector((0,0,25))-light.location).to_track_quat('-Z','Y').to_euler()
  scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.7;scene.render.filepath=str(out/(label+'-materials.png'))
 bpy.ops.render.render(write_still=True)
