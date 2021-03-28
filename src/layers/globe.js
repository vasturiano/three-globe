import {
  Color,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  SphereBufferGeometry,
  TextureLoader
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Color,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshPhongMaterial,
    SphereBufferGeometry,
    TextureLoader
  };

import { GeoJsonGeometry } from 'three-geojson-geometry';
import { createGlowMesh } from '../utils/three-glow-mesh';

import Kapsule from 'kapsule';
import { geoGraticule10 } from 'd3-geo';

import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    globeImageUrl: {},
    bumpImageUrl: {},
    showGlobe: { default: true, onChange(showGlobe, state) { state.globeObj.visible = !!showGlobe }, triggerUpdate: false },
    showGraticules: { default: false, onChange(showGraticules, state) { state.graticulesObj.visible = !!showGraticules }, triggerUpdate: false },
    showAtmosphere: { default: true, onChange(showAtmosphere, state) { state.atmosphereObj && (state.atmosphereObj.visible = !!showAtmosphere) }, triggerUpdate: false },
    atmosphereColor: { default: 'lightskyblue' },
    atmosphereAltitude: { default: 0.15 },
    onReady: { default: () => {}, triggerUpdate: false }
  },
  methods: {
    globeMaterial: function(state, globeMaterial) {
      if (globeMaterial !== undefined) {
        state.globeObj.material = globeMaterial || state.defaultGlobeMaterial;
        return this;
      }
      return state.globeObj.material;
    }
  },

  stateInit: () => {
    // create globe
    const globeGeometry = new THREE.SphereBufferGeometry(GLOBE_RADIUS, 75, 75);
    const defaultGlobeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, transparent: true });
    const globeObj = new THREE.Mesh(globeGeometry, defaultGlobeMaterial);
    globeObj.rotation.y = -Math.PI / 2; // face prime meridian along Z axis
    globeObj.__globeObjType = 'globe'; // Add object type

    // create graticules
    const graticulesObj = new THREE.LineSegments(
      new GeoJsonGeometry(geoGraticule10(), GLOBE_RADIUS, 2),
      new THREE.LineBasicMaterial({ color: 'lightgrey', transparent: true, opacity: 0.1 })
    );

    return {
      globeObj,
      graticulesObj,
      defaultGlobeMaterial
    }
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.scene.add(state.globeObj); // add globe
    state.scene.add(state.graticulesObj); // add graticules

    state.ready = false;
  },

  update(state, changedProps) {
    const globeMaterial = state.globeObj.material;

    if (changedProps.hasOwnProperty('globeImageUrl')) {
      if (!state.globeImageUrl) {
        // Black globe if no image
        !globeMaterial.color && (globeMaterial.color = new THREE.Color(0x000000));
      } else {
        new THREE.TextureLoader().load(state.globeImageUrl, texture => {
          globeMaterial.map = texture;
          globeMaterial.color = null;
          globeMaterial.needsUpdate = true;

          // ready when first globe image finishes loading (asynchronously to allow 1 frame to load texture)
          !state.ready && (state.ready = true) && setTimeout(state.onReady);
        });
      }
    }

    if (changedProps.hasOwnProperty('bumpImageUrl')) {
      if (!state.bumpImageUrl) {
        globeMaterial.bumpMap = null;
        globeMaterial.needsUpdate = true;
      } else {
        state.bumpImageUrl && new THREE.TextureLoader().load(state.bumpImageUrl, texture => {
          globeMaterial.bumpMap = texture;
          globeMaterial.needsUpdate = true;
        });
      }
    }

    if (changedProps.hasOwnProperty('atmosphereColor') || changedProps.hasOwnProperty('atmosphereAltitude')) {
      if (state.atmosphereObj) {
        // recycle previous atmosphere object
        state.scene.remove(state.atmosphereObj);
        emptyObject(state.atmosphereObj);
      }

      if (state.atmosphereColor && state.atmosphereAltitude) {
        const obj = state.atmosphereObj = createGlowMesh(state.globeObj.geometry, {
          backside: true,
          color: state.atmosphereColor,
          size: GLOBE_RADIUS * state.atmosphereAltitude,
          power: 3.5, // dispersion
          coefficient: 0.1
        });
        obj.visible = !!state.showAtmosphere;
        obj.__globeObjType = 'atmosphere'; // Add object type
        state.scene.add(obj);
      }
    }

    if (!state.ready && !state.globeImageUrl) {
      // ready immediately if there's no globe image
      state.ready = true;
      state.onReady();
    }
  }
});
