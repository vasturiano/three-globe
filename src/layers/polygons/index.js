import {
  DoubleSide,
  Mesh,
  MeshLambertMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  DoubleSide,
  Mesh,
  MeshLambertMaterial
};

import { ConicPolygonBufferGeometry } from './ConicPolygonGeometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../../color-utils';
import { emptyObject } from '../../gc';
import { threeDigest } from '../../digest';
import { GLOBE_RADIUS } from '../../constants';

//

export default Kapsule({
  props: {
    polygonsData: { default: [] },
    polygonGeoJsonGeometry: {},
    polygonSideColor: { default: () => '#ffffaa' },
    polygonCapColor: { default: () => '#ffffaa' },
    polygonAltitude: { default: 0.1 }, // in units of globe radius
    polygonsTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Data accessors
    const geoJsonAccessor = accessorFn(state.polygonGeoJsonGeometry);
    const altitudeAccessor = accessorFn(state.polygonAltitude);
    const capColorAccessor = accessorFn(state.polygonCapColor);
    const sideColorAccessor = accessorFn(state.polygonSideColor);

    const singlePolygons = [];
    state.polygonsData.forEach(polygon => {
      const objAttrs = {
        data: polygon,
        capColor: capColorAccessor(polygon),
        sideColor: sideColorAccessor(polygon),
        altitude: altitudeAccessor(polygon)
      };

      const geoJson = geoJsonAccessor(polygon);
      const geoId = polygon.__id || `${Math.round(Math.random() * 1e9)}`; // generate and stamp polygon ids to keep track in digest
      polygon.__id = geoId;

      if (geoJson.type === 'Polygon') {
        singlePolygons.push({
          id: `${geoId}_0`,
          coords: geoJson.coordinates,
          ...objAttrs
        });
      } else if (geoJson.type === 'MultiPolygon') {
        singlePolygons.push(...geoJson.coordinates.map((coords, idx) => ({
          id: `${geoId}_${idx}`,
          coords,
          ...objAttrs
        })));
      } else {
        console.warn(`Unsupported GeoJson geometry type: ${geoJson.type}. Skipping geometry...`);
      }
    });

    threeDigest(singlePolygons, state.scene, {
      idAccessor: d => d.id,
      exitObj: emptyObject,
      createObj: () => {
        const obj = new THREE.Mesh(
          undefined,
          [
            new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, depthWrite: true }), // side material
            new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, depthWrite: true })] // cap material
        );

        obj.__globeObjType = 'polygon'; // Add object type

        return obj;
      },
      updateObj: (obj, { coords, capColor, sideColor, altitude }) => {
        // update materials
        [sideColor, capColor].forEach((color, materialIdx) => {
          const opacity = colorAlpha(color);
          const material = obj.material[materialIdx];

          material.color.set(colorStr2Hex(color));
          material.transparent = opacity < 1;
          material.opacity = opacity;
        });

        const applyUpdate = ({ alt }) => {
          obj.geometry = new ConicPolygonBufferGeometry(coords, GLOBE_RADIUS, GLOBE_RADIUS * (1 + alt), false);
        };

        const targetD = { alt: altitude };
        const currentTargetD = obj.__currentTargetD || { alt: 0 };
        obj.__currentTargetD = targetD;

        if (!state.polygonsTransitionDuration || state.polygonsTransitionDuration < 0) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          new TWEEN.Tween(currentTargetD)
            .to(targetD, state.polygonsTransitionDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start();
        }
      }
    });
  }
});
