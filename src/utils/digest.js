import dataJoint from 'data-joint';

import { emptyObject } from './gc';

function threeDigest(data, scene, options = {}, { removeDelay = 0 } = {}) {
  return dataJoint(
    data,
    scene.children,
    obj => scene.add(obj),
    obj => {
      const removeFn = () => {
        scene.remove(obj);
        emptyObject(obj);
        obj && obj.hasOwnProperty('__data') && delete obj.__data.__currentTargetD;
      };
      removeDelay ? setTimeout(removeFn, removeDelay) : removeFn();
    },
    {
      objBindAttr: '__threeObj',
      ...options
    }
  );
}

export default threeDigest;