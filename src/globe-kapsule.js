import {
  Group,
  Vector2,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Group,
    Vector2,
    Vector3
  };

import Kapsule from 'kapsule';
import TWEEN from '@tweenjs/tween.js';

import { emptyObject } from './utils/gc';
import linkKapsule from './utils/kapsule-link.js';
import { polar2Cartesian, cartesian2Polar } from './utils/coordTranslate';

import GlobeLayerKapsule from './layers/globe';
import PointsLayerKapsule from './layers/points';
import ArcsLayerKapsule from './layers/arcs';
import HexBinLayerKapsule from './layers/hexbin';
import PolygonsLayerKapsule from './layers/polygons';
import HexedPolygonsLayerKapsule from './layers/hexedPolygons';
import PathsLayerKapsule from './layers/paths';
import TilesLayerKapsule from './layers/tiles';
import LabelsLayerKapsule from './layers/labels';
import RingsLayerKapsule from './layers/rings';
import ObjectsLayerKapsule from './layers/objects';
import CustomLayerKapsule from './layers/custom';

//

const layers = [
  'globeLayer',
  'pointsLayer',
  'arcsLayer',
  'hexBinLayer',
  'polygonsLayer',
  'hexedPolygonsLayer',
  'pathsLayer',
  'tilesLayer',
  'labelsLayer',
  'ringsLayer',
  'objectsLayer',
  'customLayer'
];

// Expose config from layers
const bindGlobeLayer = linkKapsule('globeLayer', GlobeLayerKapsule);
const linkedGlobeLayerProps = Object.assign(...[
  'globeImageUrl',
  'bumpImageUrl',
  'showGlobe',
  'showGraticules',
  'showAtmosphere',
  'atmosphereColor',
  'atmosphereAltitude'
].map(p => ({ [p]: bindGlobeLayer.linkProp(p)})));

const linkedGlobeLayerMethods = Object.assign(...[
  'globeMaterial'
].map(p => ({ [p]: bindGlobeLayer.linkMethod(p)})))

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
  'hexBinResolution',
  'hexMargin',
  'hexTopCurvatureResolution',
  'hexTopColor',
  'hexSideColor',
  'hexAltitude',
  'hexBinMerge',
  'hexTransitionDuration'
].map(p => ({ [p]: bindHexBinLayer.linkProp(p)})));

const bindHexedPolygonsLayer = linkKapsule('hexedPolygonsLayer', HexedPolygonsLayerKapsule);
const linkedHexedPolygonsLayerProps = Object.assign(...[
  'hexPolygonsData',
  'hexPolygonGeoJsonGeometry',
  'hexPolygonColor',
  'hexPolygonAltitude',
  'hexPolygonResolution',
  'hexPolygonMargin',
  'hexPolygonCurvatureResolution',
  'hexPolygonsTransitionDuration'
].map(p => ({ [p]: bindHexedPolygonsLayer.linkProp(p)})));

const bindPolygonsLayer = linkKapsule('polygonsLayer', PolygonsLayerKapsule);
const linkedPolygonsLayerProps = Object.assign(...[
  'polygonsData',
  'polygonGeoJsonGeometry',
  'polygonCapColor',
  'polygonCapMaterial',
  'polygonSideColor',
  'polygonSideMaterial',
  'polygonStrokeColor',
  'polygonAltitude',
  'polygonCapCurvatureResolution',
  'polygonsTransitionDuration'
].map(p => ({ [p]: bindPolygonsLayer.linkProp(p)})));

const bindPathsLayer = linkKapsule('pathsLayer', PathsLayerKapsule);
const linkedPathsLayerProps = Object.assign(...[
  'pathsData',
  'pathPoints',
  'pathPointLat',
  'pathPointLng',
  'pathPointAlt',
  'pathResolution',
  'pathColor',
  'pathStroke',
  'pathDashLength',
  'pathDashGap',
  'pathDashInitialGap',
  'pathDashAnimateTime',
  'pathTransitionDuration'
].map(p => ({ [p]: bindPathsLayer.linkProp(p)})));

const bindTilesLayer = linkKapsule('tilesLayer', TilesLayerKapsule);
const linkedTilesLayerProps = Object.assign(...[
  'tilesData',
  'tileLat',
  'tileLng',
  'tileAltitude',
  'tileWidth',
  'tileHeight',
  'tileUseGlobeProjection',
  'tileMaterial',
  'tileCurvatureResolution',
  'tilesTransitionDuration'
].map(p => ({ [p]: bindTilesLayer.linkProp(p)})));

const bindLabelsLayer = linkKapsule('labelsLayer', LabelsLayerKapsule);
const linkedLabelsLayerProps = Object.assign(...[
  'labelsData',
  'labelLat',
  'labelLng',
  'labelAltitude',
  'labelRotation',
  'labelText',
  'labelSize',
  'labelTypeFace',
  'labelColor',
  'labelResolution',
  'labelIncludeDot',
  'labelDotRadius',
  'labelDotOrientation',
  'labelsTransitionDuration'
].map(p => ({ [p]: bindLabelsLayer.linkProp(p)})));

const bindRingsLayer = linkKapsule('ringsLayer', RingsLayerKapsule);
const linkedRingsLayerProps = Object.assign(...[
  'ringsData',
  'ringLat',
  'ringLng',
  'ringAltitude',
  'ringColor',
  'ringResolution',
  'ringMaxRadius',
  'ringPropagationSpeed',
  'ringRepeatPeriod'
].map(p => ({ [p]: bindRingsLayer.linkProp(p)})));

const bindObjectsLayer = linkKapsule('objectsLayer', ObjectsLayerKapsule);
const linkedObjectsLayerProps = Object.assign(...[
  'objectsData',
  'objectLat',
  'objectLng',
  'objectAltitude',
  'objectThreeObject'
].map(p => ({ [p]: bindObjectsLayer.linkProp(p)})));

const bindCustomLayer = linkKapsule('customLayer', CustomLayerKapsule);
const linkedCustomLayerProps = Object.assign(...[
  'customLayerData',
  'customThreeObject',
  'customThreeObjectUpdate'
].map(p => ({ [p]: bindCustomLayer.linkProp(p)})));

//

export default Kapsule({
  props: {
    onGlobeReady: { triggerUpdate: false },
    rendererSize: {
      default: new THREE.Vector2(window.innerWidth, window.innerHeight),
      onChange(rendererSize, state) {
        state.pathsLayer.rendererSize(rendererSize);
      },
      triggerUpdate: false
    },
    ...linkedGlobeLayerProps,
    ...linkedPointsLayerProps,
    ...linkedArcsLayerProps,
    ...linkedHexBinLayerProps,
    ...linkedPolygonsLayerProps,
    ...linkedHexedPolygonsLayerProps,
    ...linkedPathsLayerProps,
    ...linkedTilesLayerProps,
    ...linkedLabelsLayerProps,
    ...linkedRingsLayerProps,
    ...linkedObjectsLayerProps,
    ...linkedCustomLayerProps
  },

  methods: {
    getCoords: (state, ...args) => polar2Cartesian(...args),
    toGeoCoords: (state, ...args) => cartesian2Polar(...args),
    ...linkedGlobeLayerMethods
  },

  stateInit: () => {
    return {
      globeLayer: GlobeLayerKapsule(),
      pointsLayer: PointsLayerKapsule(),
      arcsLayer: ArcsLayerKapsule(),
      hexBinLayer: HexBinLayerKapsule(),
      polygonsLayer: PolygonsLayerKapsule(),
      hexedPolygonsLayer: HexedPolygonsLayerKapsule(),
      pathsLayer: PathsLayerKapsule(),
      tilesLayer: TilesLayerKapsule(),
      labelsLayer: LabelsLayerKapsule(),
      ringsLayer: RingsLayerKapsule(),
      objectsLayer: ObjectsLayerKapsule(),
      customLayer: CustomLayerKapsule()
    }
  },

  init(threeObj, state, { animateIn = true, waitForGlobeReady = true }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    threeObj.add(state.scene = new THREE.Group());
    state.scene.visible = false; // hide scene before globe initialization

    // Add all layers groups
    layers.forEach(layer => {
      const g = new THREE.Group();
      state.scene.add(g);
      state[layer](g);
    });

    const initGlobe = () => {
      if (animateIn) {
        // Animate build-in just once
        state.scene.scale.set(1e-6, 1e-6, 1e-6);

        new TWEEN.Tween({k: 1e-6})
          .to({k: 1}, 600)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(({k}) => state.scene.scale.set(k, k, k))
          .start();

        const rotAxis = new THREE.Vector3(0, 1, 0);
        new TWEEN.Tween({rot: Math.PI * 2})
          .to({rot: 0}, 1200)
          .easing(TWEEN.Easing.Quintic.Out)
          .onUpdate(({rot}) => state.scene.setRotationFromAxisAngle(rotAxis, rot))
          .start();
      }

      state.scene.visible = true;
      state.onGlobeReady && state.onGlobeReady();
    };

    waitForGlobeReady
      ? state.globeLayer.onReady(initGlobe)
      : initGlobe();

    // run tween updates
    (function onFrame() {
      requestAnimationFrame(onFrame);
      TWEEN.update();
    })(); // IIFE
  },

  update(state) {}
});
