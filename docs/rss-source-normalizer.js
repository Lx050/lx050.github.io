/* Exact additive B8 hook allowance; never rewrites any original snapshot pin. */
'use strict';
const assert=require('assert/strict'),cp=require('child_process'),path=require('path');
const root=path.resolve(__dirname,'..'),baseline='fc5775a2f5237ccd0f29450702716bf7ec0fcc2d';
const hook='      global.CourtyardRSSDetail.attach(b);\n';
function restoreSource(input){
 const source=Buffer.isBuffer(input)?input.toString():input;
 assert.equal(source.split(hook).length,2,'one exact building8 hook');
 const restored=source.replace(hook,'');
 assert.equal(restored,cp.execFileSync('git',['-C',root,'show',baseline+':assets/architecture.js'],{encoding:'utf8'}),'only the exact single B8 hook may change original architecture source');
 return Buffer.isBuffer(input)?Buffer.from(restored):restored;
}
module.exports={restoreSource,baseline,hook};
