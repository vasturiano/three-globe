import {
  Euler,
  Mesh,
  MeshLambertMaterial,
  SphereBufferGeometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  Euler,
  Mesh,
  MeshLambertMaterial,
  SphereBufferGeometry
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';

import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    tilesData: { default: [] },
    tileLat: { default: 'lat' }, // tile centroid
    tileLng: { default: 'lng' },
    tileAltitude: { default: 0.01 }, // in units of globe radius
    tileWidth: { default: 1 }, // in lng degrees
    tileHeight: { default: 1 }, // in lat degrees
    tileUseGlobeProjection: { default: true }, // whether to size tiles relative to the globe coordinate system, or independently
    tileMaterial: { default: () => new THREE.MeshLambertMaterial({ color: '#ffbb88', opacity: 0.4, transparent: true }) },
    tileCurvatureResolution: { default: 5 }, // in angular degrees
    tilesTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Data accessors
    const latAccessor = accessorFn(state.tileLat);
    const lngAccessor = accessorFn(state.tileLng);
    const altitudeAccessor = accessorFn(state.tileAltitude);
    const widthAccessor = accessorFn(state.tileWidth);
    const heightAccessor = accessorFn(state.tileHeight);
    const useGlobeProjectionAccessor = accessorFn(state.tileUseGlobeProjection);
    const materialAccessor = accessorFn(state.tileMaterial);
    const curvatureResolutionAccessor = accessorFn(state.tileCurvatureResolution);

    threeDigest(state.tilesData, state.scene, {
      createObj: () => {
        const obj = new THREE.Mesh();

        obj.__globeObjType = 'tile'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        obj.material = materialAccessor(d); // set material

        const useGlobeProjection = useGlobeProjectionAccessor(d);
        const curvatureResolution = curvatureResolutionAccessor(d);

        // animations
        const applyPosition = td => {
          const { lat, lng, alt, width, height } = obj.__currentTargetD = td;

          const rotLng = deg2Rad(lng);
          const rotLat = deg2Rad(-lat);

          obj.geometry = new THREE.SphereBufferGeometry(
            GLOBE_RADIUS * (1 + alt),
            Math.ceil(width / curvatureResolution),
            Math.ceil(height / curvatureResolution),
            deg2Rad(90 - width / 2) + (useGlobeProjection ? rotLng : 0),
            deg2Rad(width),
            deg2Rad(90 - height / 2) + (useGlobeProjection ? rotLat : 0),
            deg2Rad(height)
          );

          if (!useGlobeProjection) {
            // rotate obj instead. order matters, rotate longitudinally first.
            obj.setRotationFromEuler(new THREE.Euler(rotLat, rotLng, 0, 'YXZ'));
          }
        };

        const targetD = {
          lat: +latAccessor(d),
          lng: +lngAccessor(d),
          alt: +altitudeAccessor(d),
          width: +widthAccessor(d),
          height: +heightAccessor(d)
        };
        const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { width: 0, height: 0 });

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
          if (!state.tilesTransitionDuration || state.tilesTransitionDuration < 0) {
            // set final position
            applyPosition(targetD);
          } else {
            // animate
            new TWEEN.Tween(currentTargetD)
              .to(targetD, state.tilesTransitionDuration)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .onUpdate(applyPosition)
              .start();
          }
        }
      }
    });
  }
});

const deg2Rad = deg => deg * Math.PI / 180;
