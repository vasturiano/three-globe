import { sum } from 'd3-array';
import * as ti from 'taichi.js';

const sq = x => x * x;

function geoDistance(a, b) { // on sphere surface, in radians
  const sqrt = Math.sqrt;
  const cos = Math.cos;
  const toRad = x => x * Math.PI / 180;
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
  await ti.init();

  const dataPnts = ti.field(ti.types.vector(ti.f32, 3), data.length); // 3rd position is weight
  const vertices = ti.field(ti.types.vector(ti.f32, 2), vertexGeoCoords.length);
  const res = ti.field(ti.f32, vertexGeoCoords.length);

  await dataPnts.fromArray(data.map(d => ([lngAccessor(d), latAccessor(d), weightAccessor(d)])));
  await vertices.fromArray(vertexGeoCoords);
  await res.fromArray(new Array(vertexGeoCoords.length).fill(0));

  ti.addToKernelScope({ dataPnts, vertices, res, bandwidth });

  await ti.kernel(() => {
    const BW_RADIUS_INFLUENCE = 4; // multiplier of bandwidth to set max radius of point influence (exclude points to improve performance)
    const PI = 3.141592653589;
    const sqrt2PI = ti.sqrt(2.0 * PI);
    const sq = x => x * x;
    const toRad = x => x * PI / 180;
    const hav = x => sq(ti.sin(x / 2));

    const geoDistance = (a, b) => { // on sphere surface, in radians
      const latA = toRad(a[1]);
      const latB = toRad(b[1]);
      const lngA = toRad(a[0]);
      const lngB = toRad(b[0]);

      // Haversine formula
      return 2 * ti.asin(ti.sqrt(hav(latB - latA) + ti.cos(latA) * ti.cos(latB) * hav(lngB - lngA)));
    }

    const gaussianKernel = (x, bw) => {
      return ti.exp(-sq(x / bw) / 2) / (bw * sqrt2PI);
    }

    const bwRad = toRad(bandwidth);
    const maxR = bandwidth * BW_RADIUS_INFLUENCE;
    const maxRRad = toRad(maxR);

    for (let v of ti.range(vertices.dimensions[0])) {
      for (let i of ti.range(dataPnts.dimensions[0])) {
        const weight = dataPnts[i].z;
        if (weight) {
          const dist = geoDistance(dataPnts[i].xy, vertices[v]);
          if (dist < maxRRad) { // max degree of influence, beyond is negligible
            res[v] += gaussianKernel(dist, bwRad) * weight;
          }
        }
      }
    }
  })();

  return await res.toArray();
}
