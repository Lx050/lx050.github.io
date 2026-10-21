/* Road release acceptance: current source, actual road meshes, original motor,
 * retained functionality, and exact unmodified predecessor acceptance. */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-results/roads/release'),base='b9975f4128f1de2df4276aab83772a06aef6c74f';fs.mkdirSync(out,{recursive:true});
const tracked=cp.execFileSync('git',['ls-tree','-r','--name-only',base],{cwd:root,encoding:'utf8'}).trim().split('\n');
const historicalExact=new Set(['detail-lod','gateway-detail','shield-detail','reme-detail','mindcare-detail','alternate-detail','dossier-detail','rss-detail','vault-detail','inscription-sightline','masterplan','current-release','masterplan-release','masterplan-layout','wave1','wave1-source-contract'].map(f=>'docs/'+f+'-check.cjs'));
const excluded=new Set(['docs/masterplan-render-export.cjs','docs/wave1-source-contract.cjs']);
const tests=tracked.filter(f=>f.startsWith('docs/')&&f.endsWith('.cjs')&&!f.includes('/navigation-qa/')&&!f.endsWith('-regression.cjs')&&!historicalExact.has(f)&&!excluded.has(f));
const current=['docs/roads-surface-check.cjs','docs/roads-preservation-check.cjs',...tests,'docs/roads-masterplan-check.cjs','docs/roads-scenery-check.cjs','docs/roads-check.cjs'];
const report={generatedAt:new Date().toISOString(),baseline:base,passed:false,complete:false,current:[],historicalOnly:tracked.filter(f=>f.startsWith('docs/')&&f.endsWith('.cjs')&&(historicalExact.has(f)||f.endsWith('-regression.cjs'))),limits:['CPU actual-geometry and original-motor evidence, not browser/WebGL/mobile/GPU evidence.','Historical source-identity fixtures are executed only on their immutable predecessor.','Actual-geometry Cycles renders are reviewed separately; their materials and lighting approximate the browser.']};
function snapshot(){const all=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>!f.startsWith('qa-results/'));return Object.fromEntries(all.sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));}
function run(file,cwd,scope,args=[]){const began=Date.now(),r=cp.spawnSync(process.execPath,[file,...args],{cwd,encoding:'utf8',maxBuffer:128*1024*1024,timeout:900000});const log=scope+'-'+file.replaceAll('/','_')+'.log';fs.writeFileSync(path.join(out,log),(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):''));const row={file,args,scope,passed:r.status===0&&!r.error,exitCode:r.status,milliseconds:Date.now()-began,log};console.log(JSON.stringify(row));return row;}
try{
 report.before=snapshot();
 for(const file of current)report.current.push(run(file,root,'current'));
 if(!process.argv.includes('--current-only')){
  const baselineDir=path.resolve(root,'../courtyard-roads-baseline-20261021');
  assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:baselineDir,encoding:'utf8'}).trim(),base);
  assert.equal(cp.execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:baselineDir,encoding:'utf8'}).trim(),'');
  report.predecessor=run('docs/masterplan-release-check.cjs',baselineDir,'historical-predecessor',['--current-only']);
  report.predecessor.acceptance=JSON.parse(fs.readFileSync(path.join(baselineDir,'qa-results/masterplan-regression/report.json')));
 }
 report.after=snapshot();assert.deepEqual(report.after,report.before,'source remained unchanged during final acceptance');
 report.passed=report.current.every(r=>r.passed)&&(!report.predecessor||report.predecessor.passed);report.complete=!process.argv.includes('--current-only');
}catch(e){report.error=String(e);console.error(e);}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,complete:report.complete,currentChecks:report.current.length,report:path.join(out,'report.json')}));if(!report.passed)process.exitCode=1;
