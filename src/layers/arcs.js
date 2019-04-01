import {
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  FaceColors,
  Geometry,
  Line,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry,
    Color,
    CubicBezierCurve3,
    FaceColors,
    Geometry,
    Line,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    QuadraticBezierCurve3,
    TubeGeometry,
    Vector3
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';
import { geoDistance, geoInterpolate } from 'd3-geo';

import { colorStr2Hex, colorAlpha } from '../color-utils';
import { emptyObject } from '../gc';
import { polar2Cartesian } from '../coordTranslate';

//

export default Kapsule({
  props: {
    arcsData: { default: []},
    arcStartLat: { default: 'startLat'},
    arcStartLng: { default: 'startLng'},
    arcEndLat: { default: 'endLat'},
    arcEndLng: { default: 'endLng'},
    arcColor: { default: () => '#ffffaa'},
    arcAltitude: {}, // in units of globe radius
    arcAltitudeAutoScale: { default: 0.5 }, // scale altitude proportional to great-arc distance between the two points
    arcStroke: {}, // in deg
    arcCurveResolution: { default: 64, triggerUpdate: false }, // how many straight segments in the curve
    arcCircularResolution: { default: 6, triggerUpdate: false }, // how many slice segments in the tube's circumference
    arcsTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Clear the existing arcs
    emptyObject(state.scene);

    // Data accessors
    const startLatAccessor = accessorFn(state.arcStartLat);
    const startLngAccessor = accessorFn(state.arcStartLng);
    const endLatAccessor = accessorFn(state.arcEndLat);
    const endLngAccessor = accessorFn(state.arcEndLng);
    const altitudeAccessor = accessorFn(state.arcAltitude);
    const altitudeAutoScaleAccessor = accessorFn(state.arcAltitudeAutoScale);
    const strokeAccessor = accessorFn(state.arcStroke);
    const colorAccessor = accessorFn(state.arcColor);

    const arcMaterials = {}; // indexed by color

    state.arcsData.forEach(arc => {
      const stroke = strokeAccessor(arc);
      const useTube = stroke !== null && stroke !== undefined;

      const obj = useTube
        ? new THREE.Mesh()
        : new THREE.Line(new THREE.BufferGeometry());

      const applyUpdate = ({ stroke, ...curveD }) => {
        const curve = calcCurve(curveD);

        if (useTube) {
          obj.geometry = new THREE.TubeGeometry(curve, state.arcCurveResolution, stroke / 2, state.arcCircularResolution);
        } else {
          obj.geometry.setFromPoints(curve.getPoints(state.arcCurveResolution));
        }
      };

      const targetD = {
        stroke,
        alt: altitudeAccessor(arc),
        altAutoScale: altitudeAutoScaleAccessor(arc),
        startLat: startLatAccessor(arc),
        startLng: startLngAccessor(arc),
        endLat: endLatAccessor(arc),
        endLng: endLngAccessor(arc)
      };

      const currentTargetD = arc.__currentTargetD;
      arc.__currentTargetD = targetD;

      if (!state.arcsTransitionDuration || state.arcsTransitionDuration < 0) {
        // set final position
        applyUpdate(targetD);
      } else {
        // animate
        new TWEEN.Tween(currentTargetD || Object.assign({}, targetD, { altAutoScale: 0 }))
          .to(targetD, state.arcsTransitionDuration)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(applyUpdate)
          .start();
      }

      obj.__globeObjType = 'arc'; // Add object type
      obj.__data = arc; // Attach point data

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

      state.scene.add(arc.__threeObj = obj);
    });

    //

    function calcCurve({ alt, altAutoScale, startLat, startLng, endLat, endLng }) {
      const getVec = ([lng, lat, alt]) => {
        const { x, y, z } = polar2Cartesian(lat, lng, alt);
        return new THREE.Vector3(x, y, z);
      };

      //calculate curve
      const startPnt = [startLng, startLat];
      const endPnt = [endLng, endLat];

      let altitude = alt;
      (altitude === null || altitude === undefined) &&
        // by default set altitude proportional to the great-arc distance
      (altitude = geoDistance(startPnt, endPnt) / 2 * altAutoScale);

      const interpolate = geoInterpolate(startPnt, endPnt);
      const [m1Pnt, m2Pnt] = [0.25, 0.75].map(t => [...interpolate(t), altitude * 1.5]);
      const curve = new THREE.CubicBezierCurve3(...[startPnt, m1Pnt, m2Pnt, endPnt].map(getVec));

      //const mPnt = [...interpolate(0.5), altitude * 2];
      //curve = new THREE.QuadraticBezierCurve3(...[startPnt, mPnt, endPnt].map(getVec));

      return curve;
    }
  }
});
