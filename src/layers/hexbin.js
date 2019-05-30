import {
  Color,
  CylinderGeometry,
  CylinderBufferGeometry,
  FaceColors,
  Geometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D
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
    MeshLambertMaterial,
    Object3D
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { hexbin as d3Hexbin } from 'd3-hexbin';
import TWEEN from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    hexBinPointsData: { default: [] },
    hexBinPointLat: { default: 'lat' },
    hexBinPointLng: { default: 'lng' },
    hexBinPointWeight: { default: 1 },
    hexRadius: { default: 0.25 }, // in deg
    hexMargin: { default: 0.2 }, // in fraction of diameter
    hexColor: { default: () => '#ffffaa' },
    hexAltitude: { default: ({ sumWeight }) => sumWeight * 0.01 }, // in units of globe radius
    hexBinMerge: { default: false }, // boolean. Whether to merge all hex geometries into a single mesh for rendering performance
    hexTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Accessors
    const latAccessor = accessorFn(state.hexBinPointLat);
    const lngAccessor = accessorFn(state.hexBinPointLng);
    const weightAccessor = accessorFn(state.hexBinPointWeight);
    const altitudeAccessor = accessorFn(state.hexAltitude);
    const colorAccessor = accessorFn(state.hexColor);
    const marginAccessor = accessorFn(state.hexMargin);

    const hexBins = d3Hexbin()
      .radius(state.hexRadius)
      .y(latAccessor)
      .x(d => lngAccessor(d) * Math.cos(latAccessor(d) * Math.PI / 180))
      (state.hexBinPointsData)
      .map(bin => ({
        points: bin.map(d => d),
        center: {
          lat: bin.y,
          lng: bin.x / Math.cos(bin.y * Math.PI / 180)
        },
        sumWeight: bin.reduce((agg, d) => agg + weightAccessor(d), 0)
      }));

    // shared geometry
    const hexGeometry = new THREE[state.hexBinMerge ? 'CylinderGeometry' : 'CylinderBufferGeometry'](1, 1, 1, 6);
    hexGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    hexGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;
    const hexMaterials = {}; // indexed by color

    const scene = state.hexBinMerge ? new THREE.Object3D() : state.scene; // use fake scene if merging hex points

    threeDigest(hexBins, scene, {
      createObj,
      updateObj,
      exitObj: emptyObject,
      idAccessor: d => `${Math.round(d.center.lat * 1e6)}-${Math.round(d.center.lng * 1e6)}`
    });

    if (state.hexBinMerge) { // merge points into a single mesh
      const hexPointsGeometry = new THREE.Geometry();

      hexBins.forEach(d => {
        const obj = d.__threeObj;
        d.__threeObj = undefined; // unbind merged points

        // color faces
        const color = new THREE.Color(colorAccessor(d));
        obj.geometry.faces.forEach(face => face.color = color);

        obj.updateMatrix();

        hexPointsGeometry.merge(obj.geometry, obj.matrix);
      });

      const hexPoints = new THREE.Mesh(hexPointsGeometry, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.FaceColors,
        morphTargets: false
      }));

      hexPoints.__globeObjType = 'hexBinPoints'; // Add object type
      hexPoints.__data = hexBins; // Attach obj data

      state.scene.add(hexPoints);
    }

    //

    function createObj() {
      const obj = new THREE.Mesh(hexGeometry);
      obj.__globeObjType = 'hexbin'; // Add object type
      return obj;
    }

    function updateObj(obj, d) {
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
        r: state.hexRadius * (1 - Math.max(0, Math.min(1, marginAccessor(d)))),
        lat: d.center.lat,
        lng: d.center.lng
      };

      const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { alt: -1e-3 });
      obj.__currentTargetD = targetD;

      if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD)) {
        if (state.hexBinMerge || !state.hexTransitionDuration || state.hexTransitionDuration < 0) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          new TWEEN.Tween(currentTargetD)
            .to(targetD, state.hexTransitionDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start();
        }
      }

      if (!state.hexBinMerge) {
        // Update materials on individual hex points
        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        if (!hexMaterials.hasOwnProperty(color)) {
          hexMaterials[color] = new THREE.MeshLambertMaterial({
            color: colorStr2Hex(color),
            transparent: opacity < 1,
            opacity: opacity
          });
        }

        obj.material = hexMaterials[color];
      }
    }
  }
});
