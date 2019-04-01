import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { emptyObject } from '../gc';
import { GLOBE_RADIUS } from '../constants';
import { dataBindDiff } from '../differ';

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
    if (!state.customThreeObjectUpdate) {

      emptyObject(state.scene); // Clear the existing objects
      createObjs(state.customLayerData).forEach(obj => state.scene.add(obj)); // create all new

    } else {

      const { enter, update, exit } = dataBindDiff(state.scene.children, state.customLayerData, { objType: 'custom' });

      const newObjs = createObjs(enter);
      const pointsData = [...enter, ...update];
      updateObjs(pointsData);

      newObjs.forEach(obj => state.scene.add(obj));

      // Remove exiting points
      exit.forEach(d => {
        const obj = d.__threeObj;
        emptyObject(obj);
        state.scene.remove(obj);
      });
    }

    //

    function createObjs(data) {
      const customObjectAccessor = accessorFn(state.customThreeObject);

      const newObjs = [];

      data.forEach(d => {
        let obj = customObjectAccessor(d, GLOBE_RADIUS);

        if (obj) {
          if (state.customThreeObject === obj) {
            // clone object if it's a shared object among all points
            obj = obj.clone();
          }

          obj.__globeObjType = 'custom'; // Add object type
          obj.__data = d; // Attach point data

          newObjs.push(d.__threeObj = obj);
        }
      });

      return newObjs;
    }

    function updateObjs(data) {
      const customObjectUpdateAccessor = accessorFn(state.customThreeObjectUpdate);

      data.forEach(d => {
        customObjectUpdateAccessor(d.__threeObj, d, GLOBE_RADIUS);
      });
    }
  }
});
