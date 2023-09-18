import { Float32BufferAttribute } from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : { Float32BufferAttribute };

function array2BufferAttr(data, itemSize, BufferAttributeClass = THREE.Float32BufferAttribute) {
  const ba = new BufferAttributeClass(data.length * itemSize, itemSize);
  itemSize === 1
    ? data.forEach((val, idx) => ba.setX(idx, val))
    : data.forEach((val, idx) => ba.set(val, idx * itemSize));
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