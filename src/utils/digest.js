import dataJoint from 'data-joint';

import { emptyObject } from './gc';

function threeDigest(data, scene, options = {}) {
  return dataJoint(
    data,
    scene.children,
    obj => scene.add(obj),
    obj => {
      scene.remove(obj);
      emptyObject(obj);
      obj.hasOwnProperty('__data') && delete obj.__data.__currentTargetD;
    },
    {
      objBindAttr: '__threeObj',
      ...options
    }
  );
}

export default threeDigest;