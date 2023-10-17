import { sum } from 'd3-array';

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