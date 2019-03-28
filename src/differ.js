import indexBy from 'index-array-by';
function diffArrays(prev, next, idAccessor = (_, idx) => idx) {
  // use array index by default

  const prevById = indexBy(prev, idAccessor, false);
  const nextById = indexBy(next, idAccessor, false);

  const byId = Object.assign({}, prevById, nextById);

  const result = {
    enter: [],
    update: [],
    exit: []
  };

  Object.entries(byId).forEach(([id, item]) => {
    const type = !prevById.hasOwnProperty(id)
      ? 'enter'
      : !nextById.hasOwnProperty(id)
        ? 'exit'
        : 'update';

    result[type].push(item);
  });

  return result;
}

function dataBindDiff(
  existingObjs,
  data,
  {
    objType,
    objTypeAttr = '__globeObjType',
    objBindAttr = '__threeObj',
    dataBindAttr = '__data',
    objIdAttr = 'uuid'
  }
) {
  const isObjValid = obj => obj[objTypeAttr] === objType && obj.hasOwnProperty(dataBindAttr);
  const isDataBound = d => d.hasOwnProperty(objBindAttr) && !!d[objBindAttr] && d[objBindAttr][objTypeAttr] === objType;

  const removeObjs = existingObjs.filter(obj => !isObjValid(obj));
  const addData = data.filter(d => !isDataBound(d));

  const prevD = existingObjs.filter(isObjValid).map(obj => obj[dataBindAttr]);
  const nextD = data.filter(isDataBound);

  const diff = diffArrays(prevD, nextD, d => d[objBindAttr][objIdAttr]);

  diff.enter = diff.enter.concat(addData);
  diff.exit = diff.exit.concat(removeObjs.map(obj => ({
    [objBindAttr]: obj
  })));

  return diff;
}

export { diffArrays, dataBindDiff };