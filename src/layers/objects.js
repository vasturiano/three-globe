import {
  Euler,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry
} from "three";

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Euler,
    Group,
    Mesh,
    MeshLambertMaterial,
    SphereGeometry
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { polar2Cartesian, deg2Rad } from '../utils/coordTranslate';

//

export default Kapsule({
  props: {
    objectsData: { default: [] },
    objectLat: { default: 'lat' },
    objectLng: { default: 'lng' },
    objectAltitude: { default: 0.01 }, // in units of globe radius
    objectFacesSurface: { default: true },
    objectRotation: {},
    objectThreeObject: { default: new THREE.Mesh(
      // default object: yellow sphere
      new THREE.SphereGeometry(1, 16, 8),
      new THREE.MeshLambertMaterial({ color: '#ffffaa', transparent: true, opacity: 0.7 })
    )}
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state, changedProps) {
    // Data accessors
    const latAccessor = accessorFn(state.objectLat);
    const lngAccessor = accessorFn(state.objectLng);
    const altitudeAccessor = accessorFn(state.objectAltitude);
    const parallelAccessor = accessorFn(state.objectFacesSurface);
    const rotationAccessor = accessorFn(state.objectRotation);
    const threeObjAccessor = accessorFn(state.objectThreeObject);

    threeDigest(state.objectsData, state.scene, {
      objBindAttr: '__threeObjObject',
      // objs need to be recreated if this prop has changed
      purge: changedProps.hasOwnProperty('objectThreeObject'),
      createObj: d => {
        let obj = threeObjAccessor(d);

        if (state.objectThreeObject === obj) {
          // clone object if it's a shared object among all points
          obj = obj.clone();
        }

        const g = new THREE.Group();
        g.add(obj);
        g.__globeObjType = 'object'; // Add object type

        return g;
      },
      updateObj: (objG, d) => {
        const lat = +latAccessor(d);
        const lng = +lngAccessor(d);
        const alt = +altitudeAccessor(d);

        Object.assign(objG.position, polar2Cartesian(lat, lng, alt));
        parallelAccessor(d)
          ? objG.setRotationFromEuler(new Euler(deg2Rad(-lat), deg2Rad(lng), 0, 'YXZ'))
          : objG.rotation.set(0, 0, 0);

        const obj = objG.children[0];
        const rot = rotationAccessor(d);
        rot && obj.setRotationFromEuler(new Euler(
          deg2Rad(rot.x || 0), deg2Rad(rot.y || 0), deg2Rad(rot.z || 0)
        ));
      }
    });
  }
});
