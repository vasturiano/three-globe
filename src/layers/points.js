import {
  Color,
  CylinderGeometry,
  CylinderBufferGeometry,
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
    CylinderBufferGeometry,
    FaceColors,
    Geometry,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../color-utils';
import { emptyObject } from '../gc';
import { dataBindDiff } from '../differ';
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
    pointResolution: { default: 12, triggerUpdate: false }, // how many slice segments in the cylinder's circumference
    pointsMerge: { default: false }, // boolean. Whether to merge all points into a single mesh for rendering performance
    pointsTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    const { enter, update, exit } = dataBindDiff(state.scene.children, state.pointsData, { objType: 'point' });

    // Remove exiting points
    exit.forEach(d => {
      const obj = d.__threeObj;
      emptyObject(obj);
      state.scene.remove(obj);
    });

    createPointObjs(enter);
    const pointsData = [...enter, ...update];
    updatePointObjs(pointsData);

    if (state.pointsMerge) { // merge points into a single mesh
      const pointsGeometry = new THREE.Geometry();
      const colorAccessor = accessorFn(state.pointColor);

      pointsData.forEach(d => {
        const obj = d.__threeObj;
        d.__threeObj = undefined; // unbind merged points

        // color faces
        const color = new THREE.Color(colorAccessor(d));
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
    }

    //

    function createPointObjs(data) {
      // shared geometry
      const pointGeometry = new THREE[state.pointsMerge ? 'CylinderGeometry' : 'CylinderBufferGeometry'](1, 1, 1, state.pointResolution);
      pointGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      pointGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

      data.forEach(d => {
        const obj = new THREE.Mesh(pointGeometry);

        obj.__globeObjType = 'point'; // Add object type
        d.__threeObj = obj;

        if (!state.pointsMerge) {
          state.scene.add(obj); // Add to scene
        }
      });
    }

    function updatePointObjs(data) {
      // Data accessors
      const latAccessor = accessorFn(state.pointLat);
      const lngAccessor = accessorFn(state.pointLng);
      const altitudeAccessor = accessorFn(state.pointAltitude);
      const radiusAccessor = accessorFn(state.pointRadius);
      const colorAccessor = accessorFn(state.pointColor);

      const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;

      data.forEach(d => {
        const obj = d.__threeObj;
        obj.__data = d; // Attach point data

        const applyUpdate = ({ r, alt, lat, lng }) => {
          // position cylinder ground
          Object.assign(obj.position, polar2Cartesian(lat, lng));

          // orientate outwards
          obj.lookAt(0, 0, 0);

          // scale radius and altitude
          obj.scale.x = obj.scale.y = Math.min(30, r) * pxPerDeg;
          obj.scale.z = Math.max(alt * GLOBE_RADIUS, 0.1); // avoid non-invertible matrix
        };

        const targetD = {
          alt: altitudeAccessor(d),
          r: radiusAccessor(d),
          lat: latAccessor(d),
          lng: lngAccessor(d)
        };

        const currentTargetD = obj.__currentTargetD;
        obj.__currentTargetD = targetD;

        if (state.pointsMerge || !state.pointsTransitionDuration || state.pointsTransitionDuration < 0) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          new TWEEN.Tween(currentTargetD || Object.assign({}, targetD, { alt: 0 }))
            .to(targetD, state.pointsTransitionDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start();
        }
      });

      if (!state.pointsMerge) {
        // Update materials on individual points
        const pointMaterials = {}; // indexed by color

        data.forEach(d => {
          const obj = d.__threeObj;

          const color = colorAccessor(d);
          const opacity = colorAlpha(color);
          if (!pointMaterials.hasOwnProperty(color)) {
            pointMaterials[color] = new THREE.MeshLambertMaterial({
              color: colorStr2Hex(color),
              transparent: opacity < 1,
              opacity: opacity
            });
          }

          obj.material = pointMaterials[color];
        });
      }
    }
  }
});
