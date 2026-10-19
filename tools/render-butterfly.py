"""Offline CPU geometry review; does not validate WebGL or browser interaction."""
import bpy,json,pathlib
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[1];out=root/'qa-results/butterfly'
for label in ['down','up']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 cache={}
 for item in json.loads((out/(label+'.json')).read_text()):
  key=tuple(item['color'])
  if key not in cache:
   m=bpy.data.materials.new('runtime color');m.diffuse_color=(*key,1);cache[key]=m
  mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(item['verts'],[],item['faces']);mesh.update();o=bpy.data.objects.new(item['name'],mesh);bpy.context.collection.objects.link(o);o.data.materials.append(cache[key])
 bpy.ops.object.camera_add(location=(115,-150,90));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,24))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=155
 scene=bpy.context.scene;scene.camera=cam;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD';scene.world.color=(.13,.18,.2);scene.render.resolution_x=1280;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.filepath=str(out/(label+'.png'));bpy.ops.render.render(write_still=True)
