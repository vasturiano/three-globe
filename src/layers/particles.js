import {
  BufferGeometry,
  Color,
  Points,
  PointsMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  BufferGeometry,
  Color,
  Points,
  PointsMaterial
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../utils/gc';
import ThreeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate.js';
import { array2BufferAttr } from '../utils/three-utils.js';
import { colorAlpha, colorStr2Hex } from '../utils/color-utils.js';

//

export default Kapsule({
  props: {
    particlesData: { default: [] },
    particlesList: { default: d => d }, // arrays of arrays
    particleLat: { default: 'lat' },
    particleLng: { default: 'lng' },
    particleAltitude: { default: 0.01 }, // in units of globe radius
    particlesSize: { default: 0.5 },
    particlesSizeAttenuation: { default: true },
    particlesColor: { default: () => 'white' },
    particlesTexture: {}
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjParticles' })
      .onCreateObj(() => {
        const obj = new THREE.Points(
          new THREE.BufferGeometry(),
          new THREE.PointsMaterial()
        );

        obj.__globeObjType = 'particles'; // Add object type

        return obj;
      })
      .onUpdateObj((obj, d) => {
        // Data accessors
        const particlesListAccessor = accessorFn(state.particlesList);
        const latAccessor = accessorFn(state.particleLat);
        const lngAccessor = accessorFn(state.particleLng);
        const altitudeAccessor = accessorFn(state.particleAltitude);

        obj.geometry.setAttribute('position', array2BufferAttr(
          particlesListAccessor(d).map(p => Object.values(polar2Cartesian(latAccessor(p), lngAccessor(p), altitudeAccessor(p)))),
          3
        ));
      });
  },

  update(state, changedProps) {
    if (['particlesData', 'particlesList', 'particleLat', 'particleLng', 'particleAltitude'].some(p => changedProps.hasOwnProperty(p))) {
      state.dataMapper.digest(state.particlesData);
    }

    // Data accessors
    const colorAccessor = accessorFn(state.particlesColor);
    const sizeAccessor = accessorFn(state.particlesSize);
    const sizeAttenuationAccessor = accessorFn(state.particlesSizeAttenuation);
    const textureAccessor = accessorFn(state.particlesTexture);

    state.dataMapper.entries().forEach(([d, obj]) => {
      obj.material.size = sizeAccessor(d);
      obj.material.sizeAttenuation = sizeAttenuationAccessor(d);

      if (!state.particlesTexture) {
        // Plain color
        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        obj.material.color = new THREE.Color(colorStr2Hex(color));
        obj.material.transparent = opacity < 1;
        obj.material.opacity = opacity;
      } else {
        obj.material.map = textureAccessor(d);
        obj.material.color = null;
        obj.material.opacity = 1;
        obj.material.needsUpdate = true;
      }
    });
  }
});
