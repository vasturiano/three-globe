import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const THREE = {
  ...(window.THREE
      ? window.THREE // Prefer consumption from global THREE, if exists
      : {}
  ),
  CSS2DObject
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import * as TWEEN from '@tweenjs/tween.js';

import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate';

//

export default Kapsule({
  props: {
    htmlElementsData: { default: [] },
    htmlLat: { default: 'lat' },
    htmlLng: { default: 'lng' },
    htmlAltitude: { default: 0 }, // in units of globe radius
    htmlElement: {},
    htmlTransitionDuration: { default: 1000, triggerUpdate: false }, // ms
    isBehindGlobe: { onChange() { this.updateObjVisibility() }, triggerUpdate: false }
  },

  methods: {
    updateObjVisibility(state, obj) {
      // default to all if no obj specified
      const objs = obj ? [obj] : state.htmlElementsData.map(d => d.__threeObj).filter(d => d);
      // Hide elements on the far side of the globe
      objs.forEach(obj => (obj.visible = !state.isBehindGlobe || !state.isBehindGlobe(obj.position)));
    }
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state, changedProps) {
    // Data accessors
    const latAccessor = accessorFn(state.htmlLat);
    const lngAccessor = accessorFn(state.htmlLng);
    const altitudeAccessor = accessorFn(state.htmlAltitude);
    const elemAccessor = accessorFn(state.htmlElement);

    threeDigest(state.htmlElementsData, state.scene, {
      // objs need to be recreated if this prop has changed
      purge: changedProps.hasOwnProperty('htmlElement'),
      createObj: d => {
        let elem = elemAccessor(d);

        const obj = new THREE.CSS2DObject(elem);

        obj.__globeObjType = 'html'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        const applyUpdate = td => {
          const { alt, lat, lng } = obj.__currentTargetD = td;
          Object.assign(obj.position, polar2Cartesian(lat, lng, alt));
          this.updateObjVisibility(obj);
        };

        const targetD = {
          lat: +latAccessor(d),
          lng: +lngAccessor(d),
          alt: +altitudeAccessor(d)
        };

        if (!state.htmlTransitionDuration || state.htmlTransitionDuration < 0 || !obj.__currentTargetD) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          new TWEEN.Tween(obj.__currentTargetD)
            .to(targetD, state.htmlTransitionDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start();
        }
      }
    });
  }
});
