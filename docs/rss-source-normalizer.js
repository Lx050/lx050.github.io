/* Exact additive B8 and B9 hook allowances; never rewrites any original snapshot pin. */
'use strict';
const assert=require('assert/strict'),cp=require('child_process'),path=require('path');
const root=path.resolve(__dirname,'..'),baseline='fc5775a2f5237ccd0f29450702716bf7ec0fcc2d';
const hook='      global.CourtyardRSSDetail.attach(b);\n';
const vaultBaseline='3582ae56650a925bd16c6a4b7a4b4288736393a6';
const vaultHook='      global.CourtyardVaultDetail.attach(b);\n';
function restoreVaultSource(input){
 const source=Buffer.isBuffer(input)?input.toString():input;
 assert.equal(source.split(vaultHook).length,2,'one exact building9 hook');
 const restored=source.replace(vaultHook,'');
 assert.equal(restored,cp.execFileSync('git',['-C',root,'show',vaultBaseline+':assets/architecture.js'],{encoding:'utf8'}),'only the exact single B9 hook may change published RSS architecture source');
 return Buffer.isBuffer(input)?Buffer.from(restored):restored;
}
function restoreSource(input){
 const source=restoreVaultSource(Buffer.isBuffer(input)?input.toString():input);
 assert.equal(source.split(hook).length,2,'one exact building8 hook');
 const restored=source.replace(hook,'');
 assert.equal(restored,cp.execFileSync('git',['-C',root,'show',baseline+':assets/architecture.js'],{encoding:'utf8'}),'only the exact single B8 hook may change original architecture source');
 return Buffer.isBuffer(input)?Buffer.from(restored):restored;
}
module.exports={restoreSource,restoreVaultSource,baseline,hook,vaultBaseline,vaultHook};
