/* Explicit provenance bridge for source-only changes; never silently relabel a render.
 * Original render scenes/reports must be retained in original-render-provenance/.
 * Geometry, material scalars, transforms, mesh names and instance colors must be identical.
 * Three's generated UUID keys are the only excluded capture content.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-results/exploration/renders'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function canonicalFingerprint(data){
 const geometry=Object.fromEntries(Object.entries(data.geometries).map(([id,g])=>[id,sha(JSON.stringify(g))])),materials=Object.fromEntries(Object.entries(data.materials).map(([id,m])=>[id,sha(JSON.stringify(m))]));
 return sha(JSON.stringify(data.objects.map(o=>({...o,geometry:geometry[o.geometry],materials:o.materials.map(id=>materials[id])}))));
}
function audit(capture){
 const originalScene=path.join(out,'original-render-provenance',capture+'-scene.json'),latestScene=path.join(out,capture+'-scene.json'),originalRender=path.join(out,'original-render-provenance',capture+'-render-report.json'),activeRender=path.join(out,capture+'-render-report.json');
 const old=JSON.parse(fs.readFileSync(originalScene)),fresh=JSON.parse(fs.readFileSync(latestScene)),render=JSON.parse(fs.readFileSync(originalRender));
 const oldCanonical=canonicalFingerprint(old),newCanonical=canonicalFingerprint(fresh);
 if(oldCanonical!==newCanonical)throw Error(capture+': actual geometry/materials/transforms changed; rerender required');
 if(sha(fs.readFileSync(originalRender))!==sha(fs.readFileSync(activeRender)))throw Error(capture+': original render metadata was altered');
 if(render.sceneFingerprint!==old.report.sceneFingerprint||JSON.stringify(render.sourceHashes)!==JSON.stringify(old.report.sourceHashes))throw Error(capture+': original render is not bound to original capture');
 const views=render.views.map(v=>({file:v.file,sha256:sha(fs.readFileSync(path.join(root,v.file)))}));
 return {validated:true,canonicalGeometryMaterialTransformFingerprint:oldCanonical,originalScene:path.relative(root,originalScene),latestScene:path.relative(root,latestScene),originalRenderReport:path.relative(root,originalRender),originalSceneFingerprint:old.report.sceneFingerprint,latestSceneFingerprint:fresh.report.sceneFingerprint,originalRenderSourceHashes:render.sourceHashes,validatedLatestSourceHashes:fresh.report.sourceHashes,changedSourceFiles:Object.keys(fresh.report.sourceHashes).filter(k=>fresh.report.sourceHashes[k]!==render.sourceHashes[k]),views};
}
function main(){const result={type:'EXPLICIT VERIFIED SOURCE REBINDING; ORIGINAL RENDER PROVENANCE RETAINED',createdAt:new Date().toISOString(),reason:'Dock apron CAR activation restriction and message changed after tree-fixed images rendered. Fresh exports are verified identical in actual geometry, material data, transforms and instance colors. Original render reports and their source hashes remain unchanged.',comparison:'Exact canonical hash over every exported object, geometry positions/indices/groups/colors, material scalars/side/vertexColors, transforms and instance colors. Only generated Three UUID references are replaced by content hashes.',captures:Object.fromEntries(['world','boat'].map(c=>[c,audit(c)]))};fs.writeFileSync(path.join(out,'source-rebinding.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({validated:true,captures:Object.fromEntries(Object.entries(result.captures).map(([k,v])=>[k,{canonicalFingerprint:v.canonicalGeometryMaterialTransformFingerprint,changedSourceFiles:v.changedSourceFiles}]))},null,2));}
module.exports={canonicalFingerprint,audit};if(require.main===module)try{main()}catch(e){console.error(e);process.exitCode=1;}
