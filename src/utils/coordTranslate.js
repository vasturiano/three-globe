import { GLOBE_RADIUS } from './../constants';

function polar2Cartesian(lat, lng, relAltitude = 0) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lng) * Math.PI / 180;
  const r = GLOBE_RADIUS * (1 + relAltitude);
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta)
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

export { polar2Cartesian, cartesian2Polar };