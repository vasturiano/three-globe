import dataJoint from 'data-joint';

function threeDigest(data, scene, options = {}) {
  return dataJoint(
    data,
    scene.children,
    obj => scene.add(obj),
    obj => scene.remove(obj),
    {
      objBindAttr: '__threeObj',
      ...options
    }
  );
}

export default threeDigest;