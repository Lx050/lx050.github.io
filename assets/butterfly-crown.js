/* A single architectural crown: three draw calls, no lights, particles or textures. */
(function(global){
  'use strict';
  function build(THREE,b,material){
    const root=new THREE.Group();root.name='suspended-butterfly-crown';root.position.set(0,61,-9);b.creature.add(root);
    const gold=material(0xc5a56b,{metalness:.55,roughness:.4,emissive:0xd5a24e,emissiveIntensity:.65});
    const fine=material(0xbba97b,{metalness:.45,roughness:.48,emissive:0xcfa65a,emissiveIntensity:.42});
    const arcs=new THREE.InstancedMesh(new THREE.TorusGeometry(20,.19,6,24,1.25),gold,4);arcs.name='four-open-crown-arcs';
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1);
    for(let i=0;i<4;i++){q.setFromEuler(new THREE.Euler(Math.PI/2,0,i*Math.PI/2+.16));matrix.compose(new THREE.Vector3(),q,unit);arcs.setMatrixAt(i,matrix);}root.add(arcs);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(17.4,.075,4,96),fine);inner.name='fine-inner-crown-register';inner.rotation.x=Math.PI/2;root.add(inner);
    const teeth=new THREE.InstancedMesh(new THREE.BoxGeometry(.25,1.8,.38),gold,12);teeth.name='twelve-crown-finials';
    for(let i=0;i<12;i++){const a=i*Math.PI/6;q.setFromAxisAngle(new THREE.Vector3(0,1,0),a);matrix.compose(new THREE.Vector3(Math.sin(a)*20,.9,Math.cos(a)*20),q,unit);teeth.setMatrixAt(i,matrix);}root.add(teeth);
    root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.isInstancedMesh)o.frustumCulled=false;}});
    b.crown={root,gold,fine};return b.crown;
  }
  function update(b){
    if(!b.crown)return;
    // Reuse the bounded flight clock; pause/reduced-motion already freeze that clock.
    const phase=b.flight.time/global.CourtyardButterflyFlight.period*Math.PI*2;
    b.crown.root.rotation.y=.16*Math.sin(phase);
    b.crown.gold.emissiveIntensity=.65+.10*Math.sin(phase);
  }
  global.CourtyardButterflyCrown=Object.freeze({build,update});
})(typeof window==='undefined'?globalThis:window);
