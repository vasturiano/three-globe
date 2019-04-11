function diffArrays(prev, next) {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);

  const result = { enter: [], update: [], exit: [] };

  new Set([...prevSet, ...nextSet]).forEach(item => {
    const type = !prevSet.has(item)
      ? 'enter'
      : !nextSet.has(item)
        ? 'exit'
        : 'update';

    result[type].push(item);
  });

  return result;
}

function dataBindDiff(
  data,
  existingObjs,
  {
    objBindAttr = '__obj',
    dataBindAttr = '__data'
  }
) {
  const isObjValid = obj => obj.hasOwnProperty(dataBindAttr);
  const isDataBound = d => d.hasOwnProperty(objBindAttr) && !!d[objBindAttr];

  const removeObjs = existingObjs.filter(obj => !isObjValid(obj));
  const addData = data.filter(d => !isDataBound(d));

  const prevD = existingObjs.filter(isObjValid).map(obj => obj[dataBindAttr]);
  const nextD = data.filter(isDataBound);

  const diff = diffArrays(prevD, nextD);

  diff.enter = diff.enter.concat(addData);
  diff.exit = diff.exit.concat(removeObjs.map(obj => ({
    [objBindAttr]: obj
  })));

  return diff;
}

function viewDigest(
  data,
  existingObjs, // list
  appendObj,  // item => {...} function
  removeObj, // item => {...} function
  {
    createObj = d => {},
    updateObj = (obj, d) => {},
    exitObj = obj => {},
    objBindAttr = '__obj',
    dataBindAttr = '__data'
  }
) {
  const { enter, update, exit } = dataBindDiff(data, existingObjs, { objBindAttr, dataBindAttr });

  const newObjs = createObjs(enter);
  const pointsData = [...enter, ...update];
  updateObjs(pointsData);

  // Add new points
  newObjs.forEach(appendObj);

  // Remove exiting points
  exit.forEach(d => {
    const obj = d[objBindAttr];
    exitObj(obj);
    removeObj(obj);
  });

  //

  function createObjs(data) {
    const newObjs = [];

    data.forEach(d => {
      const obj = createObj(d);
      if (obj) {
        obj[dataBindAttr] = d;
        d[objBindAttr] = obj;

        newObjs.push(obj);
      }
    });

    return newObjs;
  }

  function updateObjs(data) {
    data.forEach(d => {
      const obj = d[objBindAttr];
      if (obj) {
        obj[dataBindAttr] = d;
        updateObj(obj, d);
      }
    });
  }
}

function threeDigest(data, scene, { createObj, updateObj, exitObj }) {
  return viewDigest(
    data,
    scene.children,
    obj => scene.add(obj),
    obj => scene.remove(obj),
    {
      objBindAttr: '__threeObj',
      createObj,
      updateObj,
      exitObj
    }
  );
}

export { viewDigest, threeDigest };