import {
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Color,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshPhongMaterial,
    SphereGeometry,
    SRGBColorSpace,
    TextureLoader
  };

import SlippyMap from 'three-slippy-map-globe';
import GeoJsonGeometry from 'three-geojson-geometry';
import GlowMesh from '../utils/GlowMesh.js';

import Kapsule from 'kapsule';
import { geoGraticule10 } from 'd3-geo';

import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    globeImageUrl: {},
    bumpImageUrl: {},
    showGlobe: { default: true, onChange(showGlobe, state) { state.globeGroup.visible = !!showGlobe }, triggerUpdate: false },
    showGraticules: { default: false, onChange(showGraticules, state) { state.graticulesObj.visible = !!showGraticules }, triggerUpdate: false },
    showAtmosphere: { default: true, onChange(showAtmosphere, state) { state.atmosphereObj && (state.atmosphereObj.visible = !!showAtmosphere) }, triggerUpdate: false },
    atmosphereColor: { default: 'lightskyblue' },
    atmosphereAltitude: { default: 0.2 },
    atmosphereIntensity: { default: 1 },
    atmosphereDispersion: { default: 2 },
    atmosphereDensity: { default: 0.25 },
    atmosphereLightDirection: { default: [0, 0, 0] },
    globeCurvatureResolution: { default: 4 },
    globeTileEngineUrl: { onChange(v, state) { state.tileEngine.tileUrl = v } },
    globeTileEngineMaxLevel: { default: 17, onChange(v, state) { state.tileEngine.maxLevel = v }, triggerUpdate: false },
    updatePov: { onChange(v, state) { state.tileEngine.updatePov(v) }, triggerUpdate: false },
    onReady: { default: () => {}, triggerUpdate: false }
  },
  methods: {
    globeMaterial: function(state, globeMaterial) {
      if (globeMaterial !== undefined) {
        state.globeObj.material = globeMaterial || state.defaultGlobeMaterial;
        return this;
      }
      return state.globeObj.material;
    },
    _destructor: function(state) {
      emptyObject(state.globeObj);
      emptyObject(state.tileEngine);
      emptyObject(state.graticulesObj);
    }
  },

  stateInit: () => {
    // create globe
    const defaultGlobeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const globeObj = new THREE.Mesh(undefined, defaultGlobeMaterial);
    globeObj.rotation.y = -Math.PI / 2; // face prime meridian along Z axis

    // Create empty tile engine
    const tileEngine = new SlippyMap(GLOBE_RADIUS);

    // Group including globe and tile engine
    const globeGroup = new THREE.Group();
    globeGroup.__globeObjType = 'globe'; // Add object type
    globeGroup.add(globeObj);
    globeGroup.add(tileEngine);

    // create graticules
    const graticulesObj = new THREE.LineSegments(
      new GeoJsonGeometry(geoGraticule10(), GLOBE_RADIUS, 2),
      new THREE.LineBasicMaterial({ color: 'lightgrey', transparent: true, opacity: 0.1 })
    );

    return {
      globeGroup,
      globeObj,
      graticulesObj,
      defaultGlobeMaterial,
      tileEngine
    }
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.scene.add(state.globeGroup); // add globe
    state.scene.add(state.graticulesObj); // add graticules

    state.ready = false;
  },

  update(state, changedProps) {
    const globeMaterial = state.globeObj.material;

    // Hide globeObj if it's representing tiles
    state.tileEngine.visible = !(state.globeObj.visible = !state.globeTileEngineUrl);

    if (changedProps.hasOwnProperty('globeCurvatureResolution')) {
      state.globeObj.geometry?.dispose();
      const widthSegments = Math.max(4, Math.round(360 / state.globeCurvatureResolution));
      state.globeObj.geometry = new THREE.SphereGeometry(GLOBE_RADIUS, widthSegments, widthSegments / 2);

      state.tileEngine.curvatureResolution = state.globeCurvatureResolution;
    }

    if (changedProps.hasOwnProperty('globeImageUrl')) {
      if (!state.globeImageUrl) {
        // Black globe if no image
        !globeMaterial.color && (globeMaterial.color = new THREE.Color(0x000000));
      } else {
        new THREE.TextureLoader().load(state.globeImageUrl, texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
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

    if (['atmosphereColor', 'atmosphereAltitude', 'atmosphereIntensity', 'atmosphereDispersion', 'atmosphereDensity', 'atmosphereLightDirection'].some(prop => changedProps.hasOwnProperty(prop))) {
      if (state.atmosphereObj) {
        // recycle previous atmosphere object
        state.scene.remove(state.atmosphereObj);
        emptyObject(state.atmosphereObj);
      }

      if (state.atmosphereColor && state.atmosphereAltitude && state.atmosphereIntensity && state.atmosphereDispersion && state.atmosphereDensity && state.atmosphereLightDirection) {
        const obj = state.atmosphereObj = new GlowMesh(state.globeObj.geometry, {
          color: state.atmosphereColor,
          size: GLOBE_RADIUS * state.atmosphereAltitude,
          hollowRadius: GLOBE_RADIUS,
          intensity: state.atmosphereIntensity,
          coefficient: state.atmosphereDensity,
          power: state.atmosphereDispersion,
          lightDirection: state.atmosphereLightDirection,
        });
        obj.visible = !!state.showAtmosphere;
        obj.__globeObjType = 'atmosphere'; // Add object type
        state.scene.add(obj);
      }
    }

    if (!state.ready && (!state.globeImageUrl || state.globeTileEngineUrl)) {
      // ready immediately if there's no globe image
      state.ready = true;
      state.onReady();
    }
  }
});
