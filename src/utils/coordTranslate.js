import { GLOBE_RADIUS } from './../constants';

function getGlobeRadius() {
  return GLOBE_RADIUS;
}

function polar2Cartesian(lat, lng, relAltitude = 0) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lng) * Math.PI / 180;
  const r = GLOBE_RADIUS * (1 + relAltitude);
  const phiSin = Math.sin(phi);
  return {
    x: r * phiSin * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * phiSin * Math.sin(theta)
  };
}

function cartesian2Polar({ x, y, z }) {
  const r = Math.sqrt(x*x + y*y + z*z);
  const phi = Math.acos(y / r);
  const theta = Math.atan2(z, x);

  return {
    lat: 90 - phi * 180 / Math.PI,
    lng: 90 - theta * 180 / Math.PI - (theta < -Math.PI / 2 ? 360 : 0), // keep within [-180, 180] boundaries
    altitude: r / GLOBE_RADIUS - 1
  }
}

function deg2Rad(deg) { return deg * Math.PI / 180; }
function rad2Deg(rad) { return rad / Math.PI * 180; }

export { getGlobeRadius, polar2Cartesian, cartesian2Polar, rad2Deg, deg2Rad };