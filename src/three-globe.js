import { Group } from 'three';
const three = window.THREE ? window.THREE : { Group }; // Prefer consumption from global THREE, if exists

import Globe from './globe-kapsule.js';
import fromKapsule from './utils/kapsule-class.js';

export default fromKapsule(Globe, three.Group, true);
