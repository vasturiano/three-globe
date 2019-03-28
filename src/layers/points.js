import {
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Color,
    CylinderGeometry,
    FaceColors,
    Geometry,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { colorStr2Hex, colorAlpha } from '../color-utils';
import { emptyObject } from '../gc';
import { polar2Cartesian } from '../coordTranslate';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    pointsData: { default: [] },
    pointLat: { default: 'lat' },
    pointLng: { default: 'lng' },
    pointColor: { default: () => '#ffffaa' },
    pointAltitude: { default: 0.1 }, // in units of globe radius
    pointRadius: { default: 0.25 }, // in deg
    pointResolution: { default: 12 }, // how many slice segments in the cylinder's circumference
    pointsMerge: { default: false } // boolean. Whether to merge all points into a single mesh for rendering performance
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;

    // Clear the existing points
    emptyObject(state.scene);

    // Data accessors
    const latAccessor = accessorFn(state.pointLat);
    const lngAccessor = accessorFn(state.pointLng);
    const altitudeAccessor = accessorFn(state.pointAltitude);
    const radiusAccessor = accessorFn(state.pointRadius);
    const colorAccessor = accessorFn(state.pointColor);

    // Add WebGL points
    const pointGeometry = new THREE.CylinderGeometry(1, 1, 1, state.pointResolution);
    pointGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    pointGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

    const pointObjs = [];

    state.pointsData.forEach(pnt => {
      const obj = new THREE.Mesh(pointGeometry);

      // position cylinder ground
      Object.assign(obj.position, polar2Cartesian(latAccessor(pnt), lngAccessor(pnt)));

      // orientate outwards
      obj.lookAt(0, 0, 0);

      // scale radius and altitude
      obj.scale.x = obj.scale.y = Math.min(30, radiusAccessor(pnt)) * pxPerDeg;
      obj.scale.z = Math.max(altitudeAccessor(pnt) * GLOBE_RADIUS, 0.1); // avoid non-invertible matrix

      obj.__globeObjType = 'point'; // Add object type
      obj.__data = pnt; // Attach point data

      pointObjs.push(obj);
    });

    if (state.pointsMerge) { // merge points into a single mesh
      const pointsGeometry = new THREE.Geometry();

      pointObjs.forEach(obj => {
        const pnt = obj.__data;

        const color = new THREE.Color(colorAccessor(pnt));
        obj.geometry.faces.forEach(face => face.color = color);

        obj.updateMatrix();

        pointsGeometry.merge(obj.geometry, obj.matrix);
      });

      const points = new THREE.Mesh(pointsGeometry, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.FaceColors,
        morphTargets: false
      }));

      points.__globeObjType = 'points'; // Add object type
      points.__data = state.pointsData; // Attach obj data

      state.scene.add(points);

    } else { // Add individual meshes per point

      const pointMaterials = {}; // indexed by color

      pointObjs.forEach(obj => {
        const pnt = obj.__data;
        const color = colorAccessor(pnt);
        const opacity = colorAlpha(color);
        if (!pointMaterials.hasOwnProperty(color)) {
          pointMaterials[color] = new THREE.MeshLambertMaterial({
            color: colorStr2Hex(color),
            transparent: opacity < 1,
            opacity: opacity
          });
        }

        obj.material = pointMaterials[color];

        state.scene.add(pnt.__threeObj = obj);
      });
    }
  }
});
