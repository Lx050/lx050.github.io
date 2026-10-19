"""Render the exact Three.js mesh assembly using Blender CPU; textures are not baked."""
import bpy,json,pathlib,math
from mathutils import Vector
R=pathlib.Path(__file__).resolve().parents[1]; out=R/'qa-results/versions'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
cache={}
for item in json.loads((out/'runtime-assembly.json').read_text()):
 key=tuple(item['color'])+(item['opacity'],item.get('metalness',0),item.get('roughness',.8))
 if key not in cache:
  m=bpy.data.materials.new('Runtime material');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*item['color'],1);p.inputs['Roughness'].default_value=item.get('roughness') or .8;p.inputs['Metallic'].default_value=item.get('metalness') or 0
  if item['opacity']<1:p.inputs['Transmission Weight'].default_value=.8;p.inputs['Alpha'].default_value=item['opacity']
  cache[key]=m
 mesh=bpy.data.meshes.new(item['name'] or 'runtime mesh');mesh.from_pydata(item['verts'],[],item['faces']);mesh.update();o=bpy.data.objects.new(item['name'] or 'assembly',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(cache[key])
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.095));o=bpy.context.object;m=bpy.data.materials.new('Muted garden ground');m.diffuse_color=(.48,.52,.43,1);o.data.materials.append(m)
world=bpy.data.worlds.new('Soft courtyard daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.70,.77,.85,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7;bpy.context.scene.world=world
bpy.ops.object.light_add(type='AREA',location=(-10,12,19));light=bpy.context.object;light.data.energy=2400;light.data.shape='DISK';light.data.size=14;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(0,0,4.6));fill=bpy.context.object;fill.name='Review interior soft fill';fill.data.energy=650;fill.data.size=7;fill.data.color=(1,.88,.7)
bpy.ops.object.camera_add();cam=bpy.context.object;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.8
for name,pos,target,lens in [('exterior',(29,34,20),(0,0,4.2),46),('interior',(0,11.6,2.0),(0,-2,5.0),22),('proof',(1.4,7.8,3.1),(5.0,4.92,4.7),40)]:
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;scene.render.filepath=str(out/('blender-'+name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'versions-runtime-assembly.blend'))
