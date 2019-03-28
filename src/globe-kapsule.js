import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Group,
  Line,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
  QuadraticBezierCurve3,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  TubeGeometry,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Group,
  Line,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
  QuadraticBezierCurve3,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  TubeGeometry,
  Vector3
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { geoDistance, geoInterpolate } from 'd3-geo';
import TWEEN from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from './color-utils';
import { emptyObject } from './gc';
import linkKapsule from './kapsule-link.js';
import { polar2Cartesian } from './coordTranslate';
import { GLOBE_RADIUS} from './constants';

import GlobeLayerKapsule from './layers/globe';

//

// Expose config from layers
const bindGlobeLayer = linkKapsule('globeLayer', GlobeLayerKapsule);
const linkedGlobeLayerProps = Object.assign(...[
  'globeImageUrl',
  'bumpImageUrl',
  'showAtmosphere',
  'showGraticules'
].map(p => ({ [p]: bindGlobeLayer.linkProp(p)})));

//

export default Kapsule({
  props: {
    pointsData: { default: [], onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointLat: { default: 'lat', onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointLng: { default: 'lng', onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointColor: { default: () => '#ffffaa', onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointAltitude: { default: 0.1, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // in units of globe radius
    pointRadius: { default: 0.25, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // in deg
    pointResolution: { default: 12, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // how many slice segments in the cylinder's circumference
    pointsMerge: { default: false, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // boolean. Whether to merge all points into a single mesh for rendering performance
    arcsData: { default: [], onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcStartLat: { default: 'startLat', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcStartLng: { default: 'startLng', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcEndLat: { default: 'endLat', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcEndLng: { default: 'endLng', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcColor: { default: () => '#ffffaa', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcAltitude: { onChange(_, state) { state.arcsNeedsRepopulating = true }}, // in units of globe radius
    arcAltitudeAutoScale: { default: 0.5, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // scale altitude proportional to great-arc distance between the two points
    arcStroke: { onChange(_, state) { state.arcsNeedsRepopulating = true }}, // in deg
    arcCurveResolution: { default: 64, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // how many slice segments in the tube's circumference
    arcCircularResolution: { default: 6, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // how many slice segments in the tube's circumference
    arcsMerge: { default: false, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // boolean. Whether to merge all arcs into a single mesh for rendering performance
    customLayerData: { default: [], onChange(_, state) { state.customLayerNeedsRepopulating = true }},
    customThreeObject: { onChange(_, state) { state.customLayerNeedsRepopulating = true }},
    ...linkedGlobeLayerProps
  },

  methods: {
    getCoords: (state, ...args) => polar2Cartesian(...args)
  },

  stateInit: () => {
    return {
      globeLayer: GlobeLayerKapsule(),
      pointsNeedsRepopulating: true,
      arcsNeedsRepopulating: true,
      customLayerNeedsRepopulating: true,
      animateIn: false
    }
  },

  init(threeObj, state, { animateIn = true }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    threeObj.add(state.scene = new THREE.Group());

    // add globe layer group
    const globeObj = new THREE.Group();
    state.scene.add(globeObj);
    state.globeLayer(globeObj);

    state.scene.add(state.pointsG = new THREE.Group()); // add points group
    state.scene.add(state.arcsG = new THREE.Group()); // add arcs group
    state.scene.add(state.customLayerG = new THREE.Group()); // add custom layer group

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
    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;

    if (state.pointsNeedsRepopulating) {
      state.pointsNeedsRepopulating = false;

      // Clear the existing points
      emptyObject(state.pointsG);

      // Data accessors
      const latAccessor = accessorFn(state.pointLat);
      const lngAccessor = accessorFn(state.pointLng);
      const altitudeAccessor = accessorFn(state.pointAltitude);
      const radiusAccessor = accessorFn(state.pointRadius);
      const colorAccessor = accessorFn(state.pointColor);

      // Add WebGL points
      const pointGeometry = new THREE.CylinderGeometry(1, 1, 1, state.pointResolution);
      pointGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      pointGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

      const pointObjs = [];

      state.pointsData.forEach(pnt => {
        const obj = new THREE.Mesh(pointGeometry);

        // position cylinder ground
        Object.assign(obj.position, polar2Cartesian(latAccessor(pnt), lngAccessor(pnt)));

        // orientate outwards
        obj.lookAt(0, 0, 0);

        // scale radius and altitude
        obj.scale.x = obj.scale.y = Math.min(30, radiusAccessor(pnt)) * pxPerDeg;
        obj.scale.z = Math.max(altitudeAccessor(pnt) * GLOBE_RADIUS, 0.1); // avoid non-invertible matrix

        obj.__globeObjType = 'point'; // Add object type
        obj.__data = pnt; // Attach point data

        pointObjs.push(obj);
      });

      if (state.pointsMerge) { // merge points into a single mesh
        const pointsGeometry = new THREE.Geometry();

        pointObjs.forEach(obj => {
          const pnt = obj.__data;

          const color = new THREE.Color(colorAccessor(pnt));
          obj.geometry.faces.forEach(face => face.color = color);

          obj.updateMatrix();

          pointsGeometry.merge(obj.geometry, obj.matrix);
        });

        const points = new THREE.Mesh(pointsGeometry, new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: THREE.FaceColors,
          morphTargets: false
        }));

        points.__globeObjType = 'points'; // Add object type
        points.__data = state.pointsData; // Attach obj data

        state.pointsG.add(points);

      } else { // Add individual meshes per point

        const pointMaterials = {}; // indexed by color

        pointObjs.forEach(obj => {
          const pnt = obj.__data;
          const color = colorAccessor(pnt);
          const opacity = colorAlpha(color);
          if (!pointMaterials.hasOwnProperty(color)) {
            pointMaterials[color] = new THREE.MeshLambertMaterial({
              color: colorStr2Hex(color),
              transparent: opacity < 1,
              opacity: opacity
            });
          }

          obj.material = pointMaterials[color];

          state.pointsG.add(pnt.__threeObj = obj);
        });
      }
    }

    if (state.arcsNeedsRepopulating) {
      state.arcsNeedsRepopulating = false;

      // Clear the existing arcs
      emptyObject(state.arcsG);

      // Data accessors
      const startLatAccessor = accessorFn(state.arcStartLat);
      const startLngAccessor = accessorFn(state.arcStartLng);
      const endLatAccessor = accessorFn(state.arcEndLat);
      const endLngAccessor = accessorFn(state.arcEndLng);
      const altitudeAccessor = accessorFn(state.arcAltitude);
      const altitudeAutoScaleAccessor = accessorFn(state.arcAltitudeAutoScale);
      const strokeAccessor = accessorFn(state.arcStroke);
      const colorAccessor = accessorFn(state.arcColor);

      const arcObjs = [];

      state.arcsData.forEach(arc => {
        let curve;
        {
          const getVec = ([lng, lat, alt]) => {
            const { x, y, z } = polar2Cartesian(lat, lng, alt);
            return new THREE.Vector3(x, y, z);
          };

          //calculate curve
          const startPnt = [startLngAccessor, startLatAccessor].map(fn => fn(arc));
          const endPnt = [endLngAccessor, endLatAccessor].map(fn => fn(arc));

          let altitude = altitudeAccessor(arc);
          (altitude === null || altitude === undefined) &&
            // by default set altitude proportional to the great-arc distance
            (altitude = geoDistance(startPnt, endPnt) / 2 * altitudeAutoScaleAccessor(arc));

          const interpolate = geoInterpolate(startPnt, endPnt);
          const [m1Pnt, m2Pnt] = [0.25, 0.75].map(t => [...interpolate(t), altitude * 1.5]);
          curve = new THREE.CubicBezierCurve3(...[startPnt, m1Pnt, m2Pnt, endPnt].map(getVec));

          //const mPnt = [...interpolate(0.5), altitude * 2];
          //curve = new THREE.QuadraticBezierCurve3(...[startPnt, mPnt, endPnt].map(getVec));
        }

        const stroke = strokeAccessor(arc);

        const obj = (stroke === null || stroke === undefined)
          ? new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(state.arcCurveResolution))
          )
          : new THREE.Mesh(
            new THREE.TubeGeometry(curve, state.arcCurveResolution, stroke / 2, state.arcCircularResolution)
          );

        obj.__globeObjType = 'arc'; // Add object type
        obj.__data = arc; // Attach point data

        arcObjs.push(obj);
      });

      if (state.arcsMerge) { // merge arcs into a single mesh
        const arcsGeometry = new THREE.Geometry();

        arcObjs.forEach(obj => {
          const arc = obj.__data;

          const color = new THREE.Color(colorAccessor(arc));
          obj.geometry.faces.forEach(face => face.color = color);

          obj.updateMatrix();

          arcsGeometry.merge(obj.geometry, obj.matrix);
        });

        const arcs = new THREE.Mesh(arcsGeometry, new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: THREE.FaceColors,
          morphTargets: false
        }));

        arcs.__globeObjType = 'arcs'; // Add object type
        arcs.__data = state.arcsData; // Attach obj data

        state.arcsG.add(arcs);

      } else { // Add individual meshes per arc

        const arcMaterials = {}; // indexed by color

        arcObjs.forEach(obj => {
          const arc = obj.__data;
          const color = colorAccessor(arc);
          const opacity = colorAlpha(color);
          if (!arcMaterials.hasOwnProperty(color)) {
            arcMaterials[color] = new THREE.MeshLambertMaterial({
              color: colorStr2Hex(color),
              transparent: opacity < 1,
              opacity: opacity
            });
          }

          obj.material = arcMaterials[color];

          state.arcsG.add(arc.__threeObj = obj);
        });
      }
    }

    if (state.customLayerNeedsRepopulating) {
      state.customLayerNeedsRepopulating = false;

      // Clear the existing objects
      emptyObject(state.customLayerG);

      const customObjectAccessor = accessorFn(state.customThreeObject);

      state.customLayerData.forEach(d => {
        let obj = customObjectAccessor(d, GLOBE_RADIUS);

        if (obj) {
          if (state.customThreeObject === obj) {
            // clone object if it's a shared object among all points
            obj = obj.clone();
          }

          obj.__globeObjType = 'custom'; // Add object type
          obj.__data = d; // Attach point data

          state.customLayerG.add(d.__threeObj = obj);
        }
      });
    }

    if (state.animateIn) {
      // Animate build-in just once
      state.animateIn = false;
      state.scene.visible = true;

      new TWEEN.Tween({ k: 1e-6 })
        .to({ k: 1 }, 600)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(({ k }) => state.scene.scale.set(k, k, k))
        .start();

      const rotAxis = new THREE.Vector3(0, 1, 0);
      new TWEEN.Tween({ rot: Math.PI * 2 })
        .to({rot: 0}, 1200)
        .easing(TWEEN.Easing.Quintic.Out)
        .onUpdate(({ rot }) => state.scene.setRotationFromAxisAngle(rotAxis, rot))
        .start();
    }
  }
});
