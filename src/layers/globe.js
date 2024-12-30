import {
  Color,
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
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshPhongMaterial,
    SphereGeometry,
    SRGBColorSpace,
    TextureLoader
  };

import GeoJsonGeometry from 'three-geojson-geometry';
import GlowMesh from '../utils/GlowMesh.js';

import Kapsule from 'kapsule';
import { geoGraticule10 } from 'd3-geo';

import TileEngine, { convertMercatorUV } from '../utils/tile-engine';
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
    globeTileEngineUrl: { onChange(v, state, prevV) {
        // Distort or reset globe UVs as tile engine is being enabled/disabled
        const uvs = state.globeObj.geometry.attributes.uv;
        if (v && !prevV) {
          state.linearUVs = uvs.array.slice(); // in case they need to be put back
          convertMercatorUV(uvs);
        }
        if (!v && prevV) {
          uvs.array = state.linearUVs;
          uvs.needsUpdate = true;
        }

        state.tileEngine.url(v);
      }},
    globeTileEngineImgSize: { default: 256, onChange(v, state) { state.tileEngine.imgSize(v) }, triggerUpdate: false },
    globeTileEngineThresholds: { default: [5, 2, 3/4, 1/4, 1/8, 1/16], onChange(v, state) { state.tileEngine.thresholds(v) }, triggerUpdate: false },
    cameraDistance: { onChange(v, state) { state.tileEngine.cameraDistance(v) }, triggerUpdate: false },
    isInView: { onChange(v, state) { state.tileEngine.isInView(v) }, triggerUpdate: false },
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
      state.tileEngine._destructor();
      emptyObject(state.globeObj);
      emptyObject(state.graticulesObj);
    }
  },

  stateInit: () => {
    // create globe
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 75, 75);
    const defaultGlobeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const globeObj = new THREE.Mesh(globeGeometry, defaultGlobeMaterial);
    globeObj.rotation.y = -Math.PI / 2; // face prime meridian along Z axis
    globeObj.__globeObjType = 'globe'; // Add object type

    // create graticules
    const graticulesObj = new THREE.LineSegments(
      new GeoJsonGeometry(geoGraticule10(), GLOBE_RADIUS, 2),
      new THREE.LineBasicMaterial({ color: 'lightgrey', transparent: true, opacity: 0.1 })
    );

    // Bind tile engine to material
    const tileEngine = new TileEngine(globeObj.material);

    return {
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

    state.scene.add(state.globeObj); // add globe
    state.scene.add(state.graticulesObj); // add graticules

    state.ready = false;
  },

  update(state, changedProps) {
    const globeMaterial = state.globeObj.material;

    if (!state.globeTileEngineUrl && ['globeImageUrl', 'globeTileEngineUrl'].some(p => changedProps.hasOwnProperty(p))) {
      if (!state.globeImageUrl) {
        // Black globe if no image nor tiles
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

    if (changedProps.hasOwnProperty('atmosphereColor') || changedProps.hasOwnProperty('atmosphereAltitude')) {
      if (state.atmosphereObj) {
        // recycle previous atmosphere object
        state.scene.remove(state.atmosphereObj);
        emptyObject(state.atmosphereObj);
      }

      if (state.atmosphereColor && state.atmosphereAltitude) {
        const obj = state.atmosphereObj = new GlowMesh(state.globeObj.geometry, {
          color: state.atmosphereColor,
          size: GLOBE_RADIUS * state.atmosphereAltitude,
          hollowRadius: GLOBE_RADIUS,
          coefficient: 0.1,
          power: 3.5, // dispersion
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
