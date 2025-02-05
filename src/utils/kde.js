import { sum } from 'd3-array';
import { WebGPURenderer, StorageInstancedBufferAttribute } from 'three/webgpu';
import * as tsl from 'three/tsl';

const sq = x => x * x;
const toRad = x => x * Math.PI / 180;

function geoDistance(a, b) { // on sphere surface, in radians
  const sqrt = Math.sqrt;
  const cos = Math.cos;
  const hav = x => sq(Math.sin(x / 2));

  const latA = toRad(a[1]);
  const latB = toRad(b[1]);
  const lngA = toRad(a[0]);
  const lngB = toRad(b[0]);

  // Haversine formula
  return 2 * Math.asin(sqrt(hav(latB - latA) + cos(latA) * cos(latB) * hav(lngB - lngA)));
}

const sqrt2PI = Math.sqrt(2 * Math.PI);
function gaussianKernel(x, bw) {
  return Math.exp(-sq(x / bw) / 2) / (bw * sqrt2PI);
}

function epanechnikovKernel(x, bw = 0.1) {
  return Math.abs(x /= bw) <= 1 ? 0.75 * (1 - sq(x)) / bw : 0;
}

export const getGeoKDE = ([lng, lat], data = [], {
  lngAccessor = d => d[0],
  latAccessor = d => d[1],
  weightAccessor = () => 1,
  bandwidth // in degrees
} = {}) => {
  const pnt = [lng, lat];
  const bwRad = bandwidth * Math.PI / 180;

  return sum(data.map(d => {
    const weight = weightAccessor(d);
    if (!weight) return 0;
    const dist = geoDistance(pnt, [lngAccessor(d), latAccessor(d)]);
    return gaussianKernel(dist, bwRad) * weight;
  }));
};

// use WebGPU to accelerate computation of kde vals per every coord pair
export const computeGeoKde = async (vertexGeoCoords, data = [], {
  lngAccessor = d => d[0],
  latAccessor = d => d[1],
  weightAccessor = () => 1,
  bandwidth // in degrees
} = {}) => {
  const BW_RADIUS_INFLUENCE = 4; // multiplier of bandwidth to set max radius of point influence (exclude points to improve performance)

  const { Fn, If, uniform, storage, float, instanceIndex, Loop, sqrt, sin, cos, asin, exp, negate } = tsl;

  const sCoords = storage(
    new StorageInstancedBufferAttribute(new Float32Array(vertexGeoCoords.flat().map(toRad)), 2),
    'vec2',
    vertexGeoCoords.length
  );

  const sData = storage(
    new StorageInstancedBufferAttribute(new Float32Array(data.map(d => [
      toRad(lngAccessor(d)),
      toRad(latAccessor(d)),
      weightAccessor(d)
    ]).flat()), 3),
    'vec3',
    data.length
  );

  const res = new StorageInstancedBufferAttribute(vertexGeoCoords.length, 1);
  const sRes = storage(res, 'float', vertexGeoCoords.length);

  const PI = float(Math.PI);
  const sqrt2PI = sqrt(PI.mul(2));
  const sq = x => x.mul(x);
  const hav = x => sq(sin(x.div(2)));

  const geoDistance = (a, b) => { // on sphere surface, in radians
    const latA = float(a[1]);
    const latB = float(b[1]);
    const lngA = float(a[0]);
    const lngB = float(b[0]);

    // Haversine formula
    return float(2).mul(asin(sqrt(hav(latB.sub(latA)).add(cos(latA).mul(cos(latB)).mul(hav(lngB.sub(lngA)))))));
  }

  const gaussianKernel = (x, bw) =>
    exp(negate(sq(x.div(bw)).div(2))).div((bw.mul(sqrt2PI)));

  const bwRad = uniform(toRad(bandwidth));
  const maxRRad = uniform(toRad(bandwidth * BW_RADIUS_INFLUENCE));
  const n = uniform(data.length);

  const computeShaderFn = Fn(() => {
    const coords = sCoords.element(instanceIndex);
    const res = sRes.element(instanceIndex);
    res.assign(0);

    Loop(n, ({ i }) => {
      const d = sData.element(i);
      const weight = d.z;
      If(weight, () => {
        const dist = geoDistance(d.xy, coords.xy);
        If(dist && dist.lessThan(maxRRad), () => { // max degree of influence, beyond is negligible
          res.addAssign(gaussianKernel(dist, bwRad).mul(weight));
        });
      });
    });
  });

  const computeNode = computeShaderFn().compute(vertexGeoCoords.length);

  const renderer = new WebGPURenderer();
  await renderer.computeAsync(computeNode);

  return Array.from(new Float32Array(await renderer.getArrayBufferAsync(res)));
}

/*
const basicGpuCompute = async (n = 1000) => {
  const res = new StorageInstancedBufferAttribute(n, 1);
  const sRes = storage(res, 'float', n);

  const computeShaderFn = Fn(() => {
    const uN = uniform(n);
    const r = sRes.element(instanceIndex);
    r.assign(float(instanceIndex).div(uN));
  });

  const computeNode = computeShaderFn().compute(n);

  const renderer = new WebGPURenderer();
  await renderer.computeAsync(computeNode);

  return Array.from(new Float32Array(await renderer.getArrayBufferAsync(res)));
}
*/