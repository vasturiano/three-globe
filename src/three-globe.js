import { Group as ThreeGroup } from 'three';
import Globe from './globe-kapsule.js';
import fromKapsule from './utils/kapsule-class.js';

export default fromKapsule(Globe, ThreeGroup, true);
