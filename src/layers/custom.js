import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../gc';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    customLayerData: { default: [] },
    customThreeObject: {}
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Clear the existing objects
    emptyObject(state.scene);

    const customObjectAccessor = accessorFn(state.customThreeObject);

    state.customLayerData.forEach(d => {
      let obj = customObjectAccessor(d, GLOBE_RADIUS);

      if (obj) {
        if (state.customThreeObject === obj) {
          // clone object if it's a shared object among all points
          obj = obj.clone();
        }

        obj.__globeObjType = 'custom'; // Add object type
        obj.__data = d; // Attach point data

        state.scene.add(d.__threeObj = obj);
      }
    });
  }
});
