import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';
import threeDigest from '../utils/digest';

//

export default Kapsule({
  props: {
    customLayerData: { default: [] },
    customThreeObject: {},
    customThreeObjectUpdate: { triggerUpdate: false }
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    if (!state.customThreeObjectUpdate) { emptyObject(state.scene); } // Clear the existing objects to create all new, if there's no update method (brute-force)

    const customObjectAccessor = accessorFn(state.customThreeObject);
    const customObjectUpdateAccessor = accessorFn(state.customThreeObjectUpdate);

    threeDigest(state.customLayerData, state.scene, {
      createObj: d => {
        let obj = customObjectAccessor(d, GLOBE_RADIUS);

        if (obj) {
          if (state.customThreeObject === obj) {
            // clone object if it's a shared object among all points
            obj = obj.clone();
          }

          obj.__globeObjType = 'custom'; // Add object type
        }

        return obj;
      },
      updateObj: (obj, d) => customObjectUpdateAccessor(obj, d, GLOBE_RADIUS)
    });
  }
});
