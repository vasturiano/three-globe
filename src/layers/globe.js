import {
  Color,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  SphereGeometry,
  TextureLoader
} from 'three';

const THREE = window.THREE
  ? {
    // Prefer consumption from global THREE, if exists
    ...window.THREE,
    SphereGeometry // keep SphereGeometry from module for instance matching with three-glow-mesh
  } : {
    Color,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshPhongMaterial,
    SphereGeometry,
    TextureLoader
  };

import { GeoJsonGeometry } from 'three-geojson-geometry';
import { createGlowMesh } from 'three-glow-mesh';

import Kapsule from 'kapsule';
import { geoGraticule10 } from 'd3-geo';

import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    globeImageUrl: {},
    bumpImageUrl: {},
    showAtmosphere: { default: true, onChange(showAtmosphere, state) { state.atmosphereObj.visible = !!showAtmosphere }, triggerUpdate: false },
    showGraticules: { default: false, onChange(showGraticules, state) { state.graticulesObj.visible = !!showGraticules }, triggerUpdate: false },
    onReady: { default: () => {}, triggerUpdate: false }
  },
  methods: {
    globeMaterial: state => state.globeObj.material
  },

  stateInit: () => {
    // create globe
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 75, 75);
    const globeObj = new THREE.Mesh(globeGeometry, new THREE.MeshPhongMaterial({ color: 0x000000, transparent: true }));
    globeObj.rotation.y = -Math.PI / 2; // face prime meridian along Z axis
    globeObj.__globeObjType = 'globe'; // Add object type

    // create atmosphere
    const atmosphereObj = createGlowMesh(globeObj.geometry, {
      backside: true,
      color: 'lightskyblue',
      size: GLOBE_RADIUS * 0.15,
      power: 3.5, // dispersion
      coefficient: 0.1
    });
    atmosphereObj.__globeObjType = 'atmosphere'; // Add object type

    // create graticules
    const graticulesObj = new THREE.LineSegments(
      new GeoJsonGeometry(geoGraticule10(), GLOBE_RADIUS, 2),
      new THREE.LineBasicMaterial({ color: 'lightgrey', transparent: true, opacity: 0.1 })
    );

    return {
      globeObj,
      atmosphereObj,
      graticulesObj
    }
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.scene.add(state.globeObj); // add globe
    state.scene.add(state.atmosphereObj); // add atmosphere
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

    if (!state.ready && !state.globeImageUrl) {
      // ready immediately if there's no globe image
      state.ready = true;
      state.onReady();
    }
  }
});
