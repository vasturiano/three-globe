import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry,
    Color,
    CylinderGeometry,
    Matrix4,
    Mesh,
    MeshLambertMaterial,
    Object3D,
    Vector3
};

import * as _bfg from 'three/addons/utils/BufferGeometryUtils.js';
const bfg = Object.assign({}, _bfg);
const BufferGeometryUtils = bfg.BufferGeometryUtils || bfg;

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import {Tween, Easing, update} from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha, color2ShaderArr } from '../utils/color-utils';
import { array2BufferAttr } from '../utils/three-utils';
import { emptyObject } from '../utils/gc';
import ThreeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate';
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

  init(threeObj, state, { tweenGroup }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.tweenGroup = tweenGroup;

    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjPoint' });
  },

  update(state, changedProps) {
    // Data accessors
    const latAccessor = accessorFn(state.pointLat);
    const lngAccessor = accessorFn(state.pointLng);
    const altitudeAccessor = accessorFn(state.pointAltitude);
    const radiusAccessor = accessorFn(state.pointRadius);
    const colorAccessor = accessorFn(state.pointColor);

    // shared geometry
    const pointGeometry = new THREE.CylinderGeometry(1, 1, 1, state.pointResolution);
    pointGeometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    pointGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;
    const pointMaterials = {}; // indexed by color

    if(!state.pointsMerge && changedProps.hasOwnProperty('pointsMerge')) {
      emptyObject(state.scene); // Empty trailing merged objects
    }

    state.dataMapper.scene = state.pointsMerge ? new THREE.Object3D() : state.scene; // use fake scene if merging points

    state.dataMapper
      .onCreateObj(createObj)
      .onUpdateObj(updateObj)
      .digest(state.pointsData);

    if (state.pointsMerge) { // merge points into a single mesh
      const pointsGeometry = !state.pointsData.length
        ? new THREE.BufferGeometry()
        : (BufferGeometryUtils.mergeGeometries || BufferGeometryUtils.mergeBufferGeometries)(state.pointsData.map(d => {
            const obj = state.dataMapper.getObj(d);

            const geom = obj.geometry.clone();

            // apply mesh world transform to vertices
            obj.updateMatrix();
            geom.applyMatrix4(obj.matrix);

            // color vertices
            const color = color2ShaderArr(colorAccessor(d));
            geom.setAttribute('color', array2BufferAttr(
              Array(geom.getAttribute('position').count).fill(color),
              4
            ));

            return geom;
          }));

      const points = new THREE.Mesh(pointsGeometry, new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        vertexColors: true
      }));

      points.__globeObjType = 'points'; // Add object type
      points.__data = state.pointsData; // Attach obj data

      state.dataMapper.clear(); // Unbind merged points
      emptyObject(state.scene);
      state.scene.add(points);
    }

    //

    function createObj() {
      const obj = new THREE.Mesh(pointGeometry);

      obj.__globeObjType = 'point'; // Add object type
      return obj;
    }

    function updateObj(obj, d) {
      const applyUpdate = td => {
        const { r, alt, lat, lng } = obj.__currentTargetD = td;

        // position cylinder ground
        Object.assign(obj.position, polar2Cartesian(lat, lng));

        // orientate outwards
        const globeCenter = state.pointsMerge
          ? new THREE.Vector3(0, 0, 0)
          : state.scene.localToWorld(new THREE.Vector3(0, 0, 0)); // translate from local to world coords
        obj.lookAt(globeCenter);

        // scale radius and altitude
        obj.scale.x = obj.scale.y = Math.min(30, r) * pxPerDeg;
        obj.scale.z = Math.max(alt * GLOBE_RADIUS, 0.1); // avoid non-invertible matrix
      };

      const targetD = {
        alt: +altitudeAccessor(d),
        r: +radiusAccessor(d),
        lat: +latAccessor(d),
        lng: +lngAccessor(d)
      };

      const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, {alt: -1e-3});

      if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
        if (state.pointsMerge || !state.pointsTransitionDuration || state.pointsTransitionDuration < 0) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          state.tweenGroup.add(
            new Tween(currentTargetD)
              .to(targetD, state.pointsTransitionDuration)
              .easing(Easing.Quadratic.InOut)
              .onUpdate(applyUpdate)
              .start()
          );
        }
      }

      if (!state.pointsMerge) {
        // Update materials on individual points
        const color = colorAccessor(d);
        const opacity = color ? colorAlpha(color) : 0;
        const showCyl = !!opacity;
        obj.visible = showCyl;
        if (showCyl) {
          if (!pointMaterials.hasOwnProperty(color)) {
            pointMaterials[color] = new THREE.MeshLambertMaterial({
              color: colorStr2Hex(color),
              transparent: opacity < 1,
              opacity: opacity
            });
          }
          obj.material = pointMaterials[color];
        }
      }
    }
  }
});
