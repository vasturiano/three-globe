import DataBindMapper from 'data-bind-mapper';

import { emptyObject } from './gc';

class ThreeDigest extends DataBindMapper {
  constructor(scene, {
    dataBindAttr = '__data',
    objBindAttr = '__threeObj',
    removeDelay = 0
  } = {}) {
    super();

    this.scene = scene;
    this.#dataBindAttr = dataBindAttr;
    this.#objBindAttr = objBindAttr;
    this.#removeDelay = removeDelay;

    this.onRemoveObj(() => {});
  }

  onCreateObj(fn) {
    super.onCreateObj(d => {
      const obj = fn(d);
      d[this.#objBindAttr] = obj;
      obj[this.#dataBindAttr] = d;
      this.scene.add(obj);

      return obj;
    });
    return this;
  }

  onRemoveObj(fn) {
    super.onRemoveObj((obj, dId) => {
      const d = super.getData(obj);
      fn(obj, dId);

      const removeFn = () => {
        this.scene.remove(obj);
        emptyObject(obj);

        delete d[this.#objBindAttr];
      };

      this.#removeDelay ? setTimeout(removeFn, this.#removeDelay) : removeFn();
    });
    return this;
  }

  scene;
  #dataBindAttr;
  #objBindAttr;
  #removeDelay;
}

export default ThreeDigest;