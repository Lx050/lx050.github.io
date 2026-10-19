/* Distance LOD for secondary moving embellishments only. Roofs and mechanisms stay intact. */
(function (global) {
  'use strict';
  const runtime = global.CourtyardRuntime;
  if (!runtime || runtime.secondaryDetailLOD) return;
  const names = new Set([
    'editor-blender-drawer', 'twinstars-blender-screen', 'causal-blender-vent',
    'versions-blender-screen', 'rubbing-blender-overlay', 'ink-blender-carriage',
    'restoration-blender-light'
  ]);
  const cache = new WeakMap();
  function collect(record) {
    const groups = [];
    record.root.traverse(object => {
      if (object.isGroup && names.has(object.name)) groups.push(object);
    });
    cache.set(record, groups);
    return groups;
  }
  const register = runtime.register, update = runtime.update;
  runtime.register = function () {
    const record = register.apply(this, arguments);
    collect(record);
    return record;
  };
  runtime.update = function (records, position, dt, lightQuality, camera) {
    const result = update.apply(this, arguments);
    const limit = lightQuality ? 30 : 58;
    for (const record of records) {
      const visible = Math.hypot(position.x - record.origin.x, position.z - record.origin.z) < limit;
      for (const group of cache.get(record) || collect(record)) group.visible = visible;
    }
    return result;
  };
  Object.defineProperty(runtime, 'secondaryDetailLOD', { value: true });
})(window);
