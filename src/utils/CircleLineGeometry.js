import {
  BufferGeometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry
  };

class CircleLineGeometry extends THREE.BufferGeometry {
  constructor(radius = 1, segmentCount = 32) {
    super();

    this.type = 'CircleLineGeometry';

    this.parameters = { radius, segmentCount };

    const points = [];
    for(let i = 0; i <= segmentCount; i++) {
      const theta = (i / segmentCount - 0.25) * Math.PI * 2;
      points.push({ x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 });
    }
    this.setFromPoints(points);
  }
}

export default CircleLineGeometry;
