import {
  Mesh,
  MeshLambertMaterial,
  SphereGeometry
} from "three";

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Mesh,
    MeshLambertMaterial,
    SphereGeometry
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    objectsData: { default: [] },
    objectLat: { default: 'lat' },
    objectLng: { default: 'lng' },
    objectAltitude: { default: 0.01 }, // in units of globe radius
    objectThreeObject: { default: new THREE.Mesh(
      // default object: yellow sphere
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshLambertMaterial({ color: '#ffffaa', transparent: true, opacity: 0.7 })
    )}
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Data accessors
    const latAccessor = accessorFn(state.objectLat);
    const lngAccessor = accessorFn(state.objectLng);
    const altitudeAccessor = accessorFn(state.objectAltitude);
    const threeObjAccessor = accessorFn(state.objectThreeObject);

    threeDigest(state.objectsData, state.scene, {
      createObj: d => {
        let obj = threeObjAccessor(d, GLOBE_RADIUS);

        if (state.objectThreeObject === obj) {
          // clone object if it's a shared object among all points
          obj = obj.clone();
        }

        obj.__globeObjType = 'object'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        const lat = +latAccessor(d);
        const lng = +lngAccessor(d);
        const alt = +altitudeAccessor(d);

        Object.assign(obj.position, polar2Cartesian(lat, lng, alt));
      }
    });
  }
});
