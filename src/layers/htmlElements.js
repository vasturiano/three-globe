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
import { Tween, Easing } from '@tweenjs/tween.js';

import { emptyObject } from '../utils/gc';
import ThreeDigest from '../utils/digest';
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
      if (!state.dataMapper) return;
      // default to all if no obj specified
      const objs = obj ? [obj] : state.dataMapper.entries().map(([, o]) => o).filter(d => d);
      // Hide elements on the far side of the globe
      objs.forEach(obj => (obj.visible = !state.isBehindGlobe || !state.isBehindGlobe(obj.position)));
    }
  },

  init(threeObj, state, { tweenGroup }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.tweenGroup = tweenGroup;

    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjHtml' })
      .onCreateObj(d => {
        let elem = accessorFn(state.htmlElement)(d);

        const obj = new THREE.CSS2DObject(elem);

        obj.__globeObjType = 'html'; // Add object type

        return obj;
      });
  },

  update(state, changedProps) {
    // Data accessors
    const latAccessor = accessorFn(state.htmlLat);
    const lngAccessor = accessorFn(state.htmlLng);
    const altitudeAccessor = accessorFn(state.htmlAltitude);

    // objs need to be recreated if this prop has changed
    changedProps.hasOwnProperty('htmlElement') && state.dataMapper.clear();

    state.dataMapper
      .onUpdateObj((obj, d) => {
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
          state.tweenGroup.add(new Tween(obj.__currentTargetD)
            .to(targetD, state.htmlTransitionDuration)
            .easing(Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start()
          );
        }
      })
      .digest(state.htmlElementsData);
  }
});
