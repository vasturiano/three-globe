import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';
import ThreeDigest from '../utils/digest';

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

    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjCustom' })
      .onCreateObj(d => {
        let obj = accessorFn(state.customThreeObject)(d, GLOBE_RADIUS);

        if (obj) {
          if (state.customThreeObject === obj) {
            // clone object if it's a shared object among all points
            obj = obj.clone();
          }

          obj.__globeObjType = 'custom'; // Add object type
        }

        return obj;
      });
  },

  update(state, changedProps) {
    if (!state.customThreeObjectUpdate) { emptyObject(state.scene); } // Clear the existing objects to create all new, if there's no update method (brute-force)

    const customObjectUpdateAccessor = accessorFn(state.customThreeObjectUpdate);

    // objs need to be recreated if this prop has changed
    changedProps.hasOwnProperty('customThreeObject') && state.dataMapper.clear();

    state.dataMapper
      .onUpdateObj((obj, d) => customObjectUpdateAccessor(obj, d, GLOBE_RADIUS))
      .digest(state.customLayerData);
  }
});
