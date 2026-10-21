/* Capture production triangles and measured road-review cameras without WebGL.
 * MASTERPLAN_ROOT may point at an immutable baseline checkout.
 * MASTERPLAN_OUT selects before/after QA folder; ROADS_CAMERA_PLAN locks cameras.
 * Uses actual bundled Three.js, GLTFLoader, model GLBs and module builders.
 */
'use strict';
const fs=require('fs'),path=require('path');
const root=process.env.MASTERPLAN_ROOT?path.resolve(process.env.MASTERPLAN_ROOT):path.resolve(__dirname,'..');
const out=process.env.MASTERPLAN_OUT?path.resolve(process.env.MASTERPLAN_OUT):path.resolve(__dirname,'../qa-results/roads/after');
process.env.MASTERPLAN_ROOT=root;process.env.MASTERPLAN_OUT=out;
// Review actual default roads, not an optional overlaid navigation route.
if(!process.env.MASTERPLAN_ROUTE)process.env.MASTERPLAN_ROUTE='none';
const {exportScene,loadHost}=require('./masterplan-render-export.cjs');
async function main(){
 const report=await exportScene();
 const {garden:g}=await loadHost();
 const eye=(x,z)=>[x,-z,g.surfaceHeight(x,z)+1.7];
 const aim=(x,z,h=1.2)=>[x,-z,g.surfaceHeight(x,z)+h];
 const plan=process.env.ROADS_CAMERA_PLAN?JSON.parse(fs.readFileSync(process.env.ROADS_CAMERA_PLAN)):{
  coordinateSystem:'Blender (Three.js x, -z, y). Fixed cameras derived from baseline walking surface, preserved for before/after comparison.',
  views:[
   {name:'whole-layout',title:'01  WHOLE GARDEN / ROAD NETWORK',position:[80,110,900],target:[80,110,0],scale:650,ratio:[1200,1200],note:'North up | exact main-island roads, sea causeways and mathematics isles'},
   {name:'road-hierarchy',title:'02  MAIN ISLAND / ROAD HIERARCHY',position:[175,-235,300],target:[0,0,0],scale:345,ratio:[1200,1000],note:'Main avenues, circular roads, curved quiet paths and lateral branches'},
   {name:'eye-east-spine',title:'03  EYE HEIGHT / EAST SPINE',position:eye(57,0),target:aim(78,0,1.15),lens:24,type:'PERSP',ratio:[1200,800],note:'Baseline 1.7m eye height | same camera toward east terrace transition'},
   {name:'eye-road-cutouts',title:'04  EYE HEIGHT / OLD ROAD CUTOUTS',position:eye(-1.4,-33.4),target:aim(-13,-32.1,.8),lens:25,type:'PERSP',ratio:[1200,800],note:'Baseline 1.7m eye height | inner northwest ring with measured terrain clipping'},
   {name:'eye-quiet-pocket',title:'05  EYE HEIGHT / QUIET APPROACH',position:eye(35,-14),target:aim(43.14211422236,-21.04181504588,1.35),lens:23,type:'PERSP',ratio:[1200,800],note:'Baseline 1.7m eye height | quiet pocket approach, same camera before/after'},
   {name:'quiet-road-layout',title:'06  QUIET PATH / POCKET BRANCH',position:[68,7,62],target:[31,17,0],scale:82,ratio:[1200,900],note:'Exact literature-district roads, curved quiet approach and pause-pocket branch'},
   {name:'eye-pocket-branch',title:'07  EYE HEIGHT / WORKSHOP BRANCH',position:eye(-27,-24),target:aim(-39.21909152105,-29.37452740494,1.35),lens:24,type:'PERSP',ratio:[1200,800],note:'Baseline 1.7m eye height | branch from ring to existing workshop pause pocket'}
  ]
 };
 plan.baselineCameraReference=plan.baselineCameraReference||{sourceIndexSha256:report.sourceHashes['index.html'],sceneFingerprint:report.sceneFingerprint};
 fs.writeFileSync(path.join(out,'road-camera-plan.json'),JSON.stringify(plan,null,2));
 const manifest={type:'exact production-geometry road review',sourceRoot:root,sourceHashes:report.sourceHashes,sceneFingerprint:report.sceneFingerprint,cameraPlan:path.join(out,'road-camera-plan.json'),fixedCameraInput:process.env.ROADS_CAMERA_PLAN||null,roadMetadata:{hierarchy:g.roadHierarchy?.inspect?.()||null,surface:g.roadSurface?.inspect?.()||null,corridors:g.roadHierarchy?.corridors||null,mainCorridors:g.islandRoads?.corridors||null},cameraSurfaceChecks:plan.views.filter(v=>v.type==='PERSP').map(v=>({name:v.name,x:v.position[0],z:-v.position[1],fixedCameraHeight:v.position[2],currentWalkingSurface:g.surfaceHeight(v.position[0],-v.position[1]),eyeAboveCurrentSurface:v.position[2]-g.surfaceHeight(v.position[0],-v.position[1])})),limitations:report.limitations};
 fs.writeFileSync(path.join(out,'road-export-manifest.json'),JSON.stringify(manifest,null,2));
 console.log(JSON.stringify({output:out,cameras:plan.views.map(v=>v.name),sceneFingerprint:report.sceneFingerprint},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
