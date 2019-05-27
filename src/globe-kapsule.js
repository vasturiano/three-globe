import {
  Group,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Group,
    Vector3
  };

import Kapsule from 'kapsule';
import TWEEN from '@tweenjs/tween.js';

import { emptyObject } from './gc';
import linkKapsule from './kapsule-link.js';
import { polar2Cartesian, cartesian2Polar } from './coordTranslate';

import GlobeLayerKapsule from './layers/globe';
import PointsLayerKapsule from './layers/points';
import ArcsLayerKapsule from './layers/arcs';
import HexBinLayerKapsule from './layers/hexbin';
import PolygonsLayerKapsule from './layers/polygons';
import CustomLayerKapsule from './layers/custom';

//

// Expose config from layers
const bindGlobeLayer = linkKapsule('globeLayer', GlobeLayerKapsule);
const linkedGlobeLayerProps = Object.assign(...[
  'globeImageUrl',
  'bumpImageUrl',
  'showAtmosphere',
  'showGraticules'
].map(p => ({ [p]: bindGlobeLayer.linkProp(p)})));

const bindPointsLayer = linkKapsule('pointsLayer', PointsLayerKapsule);
const linkedPointsLayerProps = Object.assign(...[
  'pointsData',
  'pointLat',
  'pointLng',
  'pointColor',
  'pointAltitude',
  'pointRadius',
  'pointResolution',
  'pointsMerge',
  'pointsTransitionDuration'
].map(p => ({ [p]: bindPointsLayer.linkProp(p)})));

const bindArcsLayer = linkKapsule('arcsLayer', ArcsLayerKapsule);
const linkedArcsLayerProps = Object.assign(...[
  'arcsData',
  'arcStartLat',
  'arcStartLng',
  'arcEndLat',
  'arcEndLng',
  'arcColor',
  'arcAltitude',
  'arcAltitudeAutoScale',
  'arcStroke',
  'arcCurveResolution',
  'arcCircularResolution',
  'arcDashLength',
  'arcDashGap',
  'arcDashInitialGap',
  'arcDashAnimateTime',
  'arcsTransitionDuration'
].map(p => ({ [p]: bindArcsLayer.linkProp(p)})));

const bindHexBinLayer = linkKapsule('hexBinLayer', HexBinLayerKapsule);
const linkedHexBinLayerProps = Object.assign(...[
  'hexBinPointsData',
  'hexBinPointLat',
  'hexBinPointLng',
  'hexBinPointWeight',
  'hexRadius',
  'hexMargin',
  'hexColor',
  'hexAltitude',
  'hexBinMerge',
  'hexTransitionDuration'
].map(p => ({ [p]: bindHexBinLayer.linkProp(p)})));

const bindPolygonsLayer = linkKapsule('polygonsLayer', PolygonsLayerKapsule);
const linkedPolygonsLayerProps = Object.assign(...[
  'polygonsData',
  'polygonGeoJsonGeometry',
  'polygonColor',
  'polygonAltitude',
  'polygonsTransitionDuration'
].map(p => ({ [p]: bindPolygonsLayer.linkProp(p)})));

const bindCustomLayer = linkKapsule('customLayer', CustomLayerKapsule);
const linkedCustomLayerProps = Object.assign(...[
  'customLayerData',
  'customThreeObject',
  'customThreeObjectUpdate'
].map(p => ({ [p]: bindCustomLayer.linkProp(p)})));

//

export default Kapsule({
  props: {
    ...linkedGlobeLayerProps,
    ...linkedPointsLayerProps,
    ...linkedArcsLayerProps,
    ...linkedHexBinLayerProps,
    ...linkedPolygonsLayerProps,
    ...linkedCustomLayerProps
  },

  methods: {
    getCoords: (state, ...args) => polar2Cartesian(...args),
    toGeoCoords: (state, ...args) => cartesian2Polar(...args)
  },

  stateInit: () => {
    return {
      globeLayer: GlobeLayerKapsule(),
      pointsLayer: PointsLayerKapsule(),
      arcsLayer: ArcsLayerKapsule(),
      hexBinLayer: HexBinLayerKapsule(),
      polygonsLayer: PolygonsLayerKapsule(),
      customLayer: CustomLayerKapsule(),
      animateIn: false
    }
  },

  init(threeObj, state, { animateIn = true }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    threeObj.add(state.scene = new THREE.Group());

    // add globe layer group
    const globeG = new THREE.Group();
    state.scene.add(globeG);
    state.globeLayer(globeG);

    // add points layer group
    const pointsG = new THREE.Group();
    state.scene.add(pointsG);
    state.pointsLayer(pointsG);

    // add arcs layer group
    const arcsG = new THREE.Group();
    state.scene.add(arcsG);
    state.arcsLayer(arcsG);

    // add hexbin layer group
    const hexBinG = new THREE.Group();
    state.scene.add(hexBinG);
    state.hexBinLayer(hexBinG);

    // add polygons layer group
    const polygonsG = new THREE.Group();
    state.scene.add(polygonsG);
    state.polygonsLayer(polygonsG);

    // add custom layer group
    const customG = new THREE.Group();
    state.scene.add(customG);
    state.customLayer(customG);

    // animate build in, one time only
    state.animateIn = animateIn;
    if (animateIn) {
      state.scene.visible = false; // hide before animation
    }

    // run tween updates
    (function onFrame() {
      requestAnimationFrame(onFrame);
      TWEEN.update();
    })(); // IIFE
  },

  update(state) {
    if (state.animateIn) {
      setTimeout(() => {
        // Animate build-in just once
        state.animateIn = false;
        state.scene.visible = true;

        new TWEEN.Tween({k: 1e-6})
          .to({k: 1}, 600)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(({ k }) => state.scene.scale.set(k, k, k))
          .start();

        const rotAxis = new THREE.Vector3(0, 1, 0);
        new TWEEN.Tween({rot: Math.PI * 2})
          .to({rot: 0}, 1200)
          .easing(TWEEN.Easing.Quintic.Out)
          .onUpdate(({ rot }) => state.scene.setRotationFromAxisAngle(rotAxis, rot))
          .start();
      }, 600); // delay animation slightly to load globe texture
    }
  }
});
