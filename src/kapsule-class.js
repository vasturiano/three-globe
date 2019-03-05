export default function(kapsule, baseClass = Object, initKapsuleWithSelf = false) {

  class FromKapsule extends baseClass {
    constructor(...args) {
      super(...args);
      this.__kapsuleInstance = kapsule()(...[...(initKapsuleWithSelf ? [this] : []), ...args]);
    }
  }

  // attach kapsule props/methods to class prototype
  Object.keys(kapsule())
    .forEach(m => FromKapsule.prototype[m] = function(...args) {
      const returnVal = this.__kapsuleInstance[m](...args);

      return returnVal === this.__kapsuleInstance
        ? this  // chain based on this class, not the kapsule obj
        : returnVal;
    });

  return FromKapsule;

}
