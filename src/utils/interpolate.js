import { interpolateArray } from 'd3-interpolate';

import { Vector3 } from 'three';
const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : { Vector3 };

export function interpolateVectors(fromPnts, toPnts) {
  const extendArr = (arr, length) => {
    const repeatItem = arr[arr.length-1];
    return [...arr, ...[...new Array(length - arr.length)].map(() => repeatItem)];
  };

  const arrLength = Math.max(fromPnts.length, toPnts.length);

  const interpolator = interpolateArray(...[fromPnts, toPnts]
    .map(pnts => pnts.map(({ x, y, z }) => [x, y, z]))
    .map(arr => extendArr(arr, arrLength)) // make sure both have the same length
  );

  return k => k === 0
    ? fromPnts
    : k === 1
      ? toPnts
      : interpolator(k).map(([x, y, z]) => new THREE.Vector3(x, y, z));
}