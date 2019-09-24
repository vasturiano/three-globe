const materialDispose = material => {
  if (material instanceof Array) {
    material.forEach(materialDispose);
  } else {
    if (material.map) { material.map.dispose(); }
    material.dispose();
  }
};

const deallocate = obj => {
  if (obj.geometry) { obj.geometry.dispose(); }
  if (obj.material) { materialDispose(obj.material); }
  if (obj.texture) { obj.texture.dispose(); }
  if (obj.children) { obj.children.forEach(deallocate); }
};

const emptyObject = obj => {
  while (obj.children.length) {
    const childObj = obj.children[0];
    obj.remove(childObj);
    deallocate(childObj);
  }
};

export { emptyObject, deallocate };
