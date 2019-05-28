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

import earcut from 'earcut';

function ConicPolygonGeometry(polygonGeoJson, startHeight, endHeight, closedBottom, closedTop, includeSides) {
  Geometry.call(this);

  this.type = 'ConicPolygonGeometry';

  this.parameters = {
    polygonGeoJson,
    startHeight,
    endHeight,
    closedBottom,
    closedTop,
    includeSides
  };

  this.fromBufferGeometry(new ConicPolygonBufferGeometry(polygonGeoJson, startHeight, endHeight, closedBottom, closedTop, includeSides));
  this.mergeVertices();
}

ConicPolygonGeometry.prototype = Object.create(Geometry.prototype);
ConicPolygonGeometry.prototype.constructor = ConicPolygonGeometry;

function ConicPolygonBufferGeometry(polygonGeoJson, startHeight, endHeight, closedBottom, closedTop, includeSides) {

  BufferGeometry.call(this);

  this.type = 'ConicPolygonBufferGeometry';

  this.parameters = {
    polygonGeoJson,
    startHeight,
    endHeight,
    closedBottom,
    closedTop,
    includeSides
  };

  // defaults
  startHeight = startHeight || 0;
  endHeight = endHeight || 1;
  closedBottom = closedBottom !== undefined ? closedBottom : true;
  closedTop = closedTop !== undefined ? closedTop : true;
  includeSides = includeSides !== undefined ? includeSides : true;

  // calc vertices & indices
  const { vertices: bottomVerts, holes } = generateVertices(startHeight);
  const { vertices: topVerts } = generateVertices(endHeight);
  const numPoints = Math.round(topVerts.length / 3);
  const vertices = [...topVerts, ...bottomVerts];

  let indices = [];
  let groupCnt = 0; // add groups to apply different materials to torso / caps

  if (includeSides) {
    const prevIndCnt = indices.length;
    indices = indices.concat(generateTorso());
    this.addGroup(prevIndCnt, indices.length - prevIndCnt, groupCnt++);
  }

  if (closedBottom) {
    const prevIndCnt = indices.length;
    indices = indices.concat(generateCap(false));
    this.addGroup(prevIndCnt, indices.length - prevIndCnt, groupCnt++);
  }

  if (closedTop) {
    const prevIndCnt = indices.length;
    indices = indices.concat(generateCap(true));
    this.addGroup(prevIndCnt, indices.length - prevIndCnt, groupCnt++);
  }

  // build geometry
  this.setIndex(indices);
  this.addAttribute('position', new Float32BufferAttribute(vertices, 3));

  //

  function generateVertices(altitude) {
    const coords3d = polygonGeoJson.map(coords => coords.map(([lng, lat]) => polar2Cartesian(lat, lng, altitude)));
    // returns { vertices, holes, coordinates }. Each point generates 3 vertice items (x,y,z).
    return earcut.flatten(coords3d);
  }

  function generateTorso() {
    const holesIdx = new Set(holes);
    let lastHoleIdx = 0;

    const indices = [];
    for (let v0Idx = 0; v0Idx < numPoints; v0Idx++) {
      let v1Idx = v0Idx + 1; // next point
      if (v1Idx === numPoints) {
        v1Idx = lastHoleIdx; // close final loop
      } else if (holesIdx.has(v1Idx)) {
        const holeIdx = v1Idx;
        v1Idx = lastHoleIdx; // close hole loop
        lastHoleIdx = holeIdx;
      }

      // Each pair of coords generates two triangles (faces)
      indices.push(v0Idx, v0Idx + numPoints, v1Idx + numPoints);
      indices.push(v1Idx + numPoints, v1Idx, v0Idx);
    }

    return indices;
  }

  function generateCap(top = true) {
    let capIndices = earcut(top ? topVerts : bottomVerts, holes, 3);

    !top && (capIndices = capIndices.map(v => v + numPoints)); // translate bottom indices

    return capIndices;
  }
}

ConicPolygonBufferGeometry.prototype = Object.create(BufferGeometry.prototype);
ConicPolygonBufferGeometry.prototype.constructor = ConicPolygonBufferGeometry;

//

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
