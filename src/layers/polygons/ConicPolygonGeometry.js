import {
  BufferGeometry,
  Float32BufferAttribute,
  Geometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  BufferGeometry,
  Float32BufferAttribute,
  Geometry
};

import { geoCentroid } from 'd3-geo';

function ConicPolygonGeometry(polygonGeoJson, startHeight, endHeight, capSegments) {
  Geometry.call(this);

  this.type = 'ConicPolygonGeometry';

  this.parameters = {
    polygonGeoJson,
    startHeight,
    endHeight,
    capSegments
  };

  this.fromBufferGeometry(new ConicPolygonBufferGeometry(polygonGeoJson, startHeight, endHeight, capSegments));
  this.mergeVertices();
}

ConicPolygonGeometry.prototype = Object.create(Geometry.prototype);
ConicPolygonGeometry.prototype.constructor = ConicPolygonGeometry;

function ConicPolygonBufferGeometry(polygonGeoJson, startHeight, endHeight, capSegments) {

  BufferGeometry.call(this);

  this.type = 'ConicPolygonBufferGeometry';

  this.parameters = {
    polygonGeoJson,
    startHeight,
    endHeight,
    capSegments
  };

  startHeight = startHeight || 0;
  endHeight = endHeight || 1;
  capSegments = Math.floor(capSegments) || 8;

  // buffers
  const indices = [];
  const vertices = [];

  generateVertices();
  generateTorso();
  generateCap();

  // build geometry
  this.setIndex(indices);
  this.addAttribute('position', new Float32BufferAttribute(vertices, 3));

  return;

  // each coord is stored as 6 coords (x,y,z * (startHeight + endHeight))
  function generateVertices() {
    const [exterior = [], ...holes] = polygonGeoJson;

    exterior.forEach(([lng, lat]) => {
      vertices.push(...polar2Cartesian(lat, lng, startHeight));
      vertices.push(...polar2Cartesian(lat, lng, endHeight));
    });
  }

  function generateTorso() {
    const [exterior = [], ...holes] = polygonGeoJson;

    for (let pntIdx = 0, len = exterior.length; pntIdx < len; pntIdx++) {
      const v0Idx = pntIdx * 2; // 2 vertices per point
      const v1Idx = pntIdx === len - 1 ? 0 : (pntIdx + 1) * 2; // close the loop

      // Each pair of coords generates two triangles (faces)
      indices.push(v0Idx, v0Idx + 1, v1Idx + 1);
      indices.push(v1Idx + 1, v1Idx, v0Idx);
    }
  }

  function generateCap(top = true) {
    // append centroid vertex
    const [centroidLng, centroidLat] = geoCentroid({ type: 'Polygon', coordinates: polygonGeoJson });
    const centroidIdx = Math.round(vertices.length / 3);
    vertices.push(...polar2Cartesian(centroidLat, centroidLng, top ? endHeight: startHeight));

    const [exterior = [], ...holes] = polygonGeoJson;

    for (let pntIdx = 0, len = exterior.length; pntIdx < len; pntIdx++) {
      const v0Idx = pntIdx * 2; // 2 vertices per point
      const v1Idx = pntIdx === len - 1 ? 0 : (pntIdx + 1) * 2; // close the loop

      // One triangle per coord to the centroid
      indices.push(v0Idx + (top ? 1 : 0), v1Idx + (top ? 1 : 0), centroidIdx);
    }

  }
}

ConicPolygonBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
ConicPolygonBufferGeometry.prototype.constructor = ConicPolygonBufferGeometry;

function polar2Cartesian(lat, lng, r = 0) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lng) * Math.PI / 180;
  return [
    r * Math.sin(phi) * Math.cos(theta), // x
    r * Math.cos(phi), // y
    r * Math.sin(phi) * Math.sin(theta) // z
  ];
}

export { ConicPolygonGeometry, ConicPolygonBufferGeometry };