import { BufferAttribute } from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : { BufferAttribute };

function array2BufferAttr(data, itemSize = 1, ArrayClass = Float32Array) {
  if (itemSize === 1) { // edge case handle for improved performance
    return new THREE.BufferAttribute(new ArrayClass(data), itemSize);
  }

  const ba = new THREE.BufferAttribute(new ArrayClass(data.length * itemSize), itemSize);
  for (let idx = 0, l = data.length; idx < l; idx++) {
    ba.set(data[idx], idx * itemSize);
  }
  return ba;
}

function bufferAttr2Array(ba) {
  const itemSize = ba.itemSize;
  const res = [];
  for (let i = 0; i < ba.count; i++) {
    res.push(ba.array.slice(i * itemSize, (i + 1) * itemSize));
  }
  return res;
}

export { array2BufferAttr, bufferAttr2Array };