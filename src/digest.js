import indexBy from 'index-array-by';

function diffArrays(prev, next, idAccessor) {
  const result = { enter: [], update: [], exit: [] };

  if (!idAccessor) { // use object references for comparison
    const prevSet = new Set(prev);
    const nextSet = new Set(next);

    new Set([...prevSet, ...nextSet]).forEach(item => {
      const type = !prevSet.has(item)
        ? 'enter'
        : !nextSet.has(item)
          ? 'exit'
          : 'update';

      result[type].push(type === 'update' ? [item, item]: item);
    });
  } else { // compare by id (duplicate keys are ignored)
    const prevById = indexBy(prev, idAccessor, false);
    const nextById = indexBy(next, idAccessor, false);
    const byId = Object.assign({}, prevById, nextById);

    Object.entries(byId).forEach(([id, item]) => {
      const type = !prevById.hasOwnProperty(id)
        ? 'enter'
        : !nextById.hasOwnProperty(id)
          ? 'exit'
          : 'update';

      result[type].push(type === 'update' ? [prevById[id], nextById[id]]: item);
    });
  }

  return result;
}

function dataBindDiff(
  data,
  existingObjs,
  {
    objBindAttr = '__obj',
    dataBindAttr = '__data',
    idAccessor
  }
) {
  const isObjValid = obj => obj.hasOwnProperty(dataBindAttr);

  const removeObjs = existingObjs.filter(obj => !isObjValid(obj));

  const prevD = existingObjs.filter(isObjValid).map(obj => obj[dataBindAttr]);
  const nextD = data;

  const diff = diffArrays(prevD, nextD, idAccessor);

  diff.update = diff.update.map(([prevD, nextD]) => {
    if (prevD !== nextD) {
      // transfer obj to new data point (if different)
      nextD[objBindAttr] = prevD[objBindAttr];
      nextD[objBindAttr][dataBindAttr] = nextD;
    }
    return nextD;
  });
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
    dataBindAttr = '__data',
    idAccessor
  }
) {
  const { enter, update, exit } = dataBindDiff(data, existingObjs, { objBindAttr, dataBindAttr, idAccessor });

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

function threeDigest(data, scene, { createObj, updateObj, exitObj, idAccessor }) {
  return viewDigest(
    data,
    scene.children,
    obj => scene.add(obj),
    obj => scene.remove(obj),
    {
      objBindAttr: '__threeObj',
      createObj,
      updateObj,
      exitObj,
      idAccessor
    }
  );
}

export { viewDigest, threeDigest };