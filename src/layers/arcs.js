import {
  AdditiveBlending,
  BufferGeometry,
  CubicBezierCurve3,
  Float32BufferAttribute,
  Line,
  Mesh,
  QuadraticBezierCurve3,
  ShaderMaterial,
  TubeBufferGeometry,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    AdditiveBlending,
    BufferGeometry,
    CubicBezierCurve3,
    Float32BufferAttribute,
    Line,
    Mesh,
    QuadraticBezierCurve3,
    ShaderMaterial,
    TubeBufferGeometry,
    Vector3
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';
import { geoDistance, geoInterpolate } from 'd3-geo';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import { color2ShaderArr } from '../color-utils';
import { emptyObject } from '../gc';
import { polar2Cartesian } from '../coordTranslate';

//

const gradientShaders = {
  uniforms: {
    // dash param defaults, all relative to full length
    dashOffset: { value: 0 },
    dashSize: { value: 1 },
    gapSize: { value: 0 },
    dashTranslate: { value: 0 } // used for animating the dash
  },
  vertexShader: `
    uniform float dashTranslate; 

    attribute vec4 vertexColor;
    varying vec4 vColor;
    
    attribute float vertexRelDistance;
    varying float vRelDistance;

    void main() {
      // pass through colors and distances
      vColor = vertexColor;
      vRelDistance = vertexRelDistance + dashTranslate;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float dashOffset; 
    uniform float dashSize;
    uniform float gapSize; 
    
    varying vec4 vColor;
    varying float vRelDistance;
    
    void main() {
      // ignore pixels in the gap
      if (vRelDistance < dashOffset) discard;
      if (mod(vRelDistance - dashOffset, dashSize + gapSize) > dashSize) discard;
    
      // set px color: [r, g, b, a], interpolated between vertices 
      gl_FragColor = vColor; 
    }
  `
};

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

    const sharedMaterial = new THREE.ShaderMaterial({
      ...gradientShaders,
      transparent: true,
      blending: THREE.AdditiveBlending
      //depthTest: false,
    });

    state.arcsData.forEach(arc => {
      const stroke = strokeAccessor(arc);
      const useTube = stroke !== null && stroke !== undefined;

      const obj = useTube
        ? new THREE.Mesh()
        : new THREE.Line(new THREE.BufferGeometry());

      obj.material = sharedMaterial.clone(); // Separate material instance per object to have dedicated uniforms (but shared shaders)

      // obj.material.uniforms.dashSize.value = obj.material.uniforms.gapSize.value = 0.05;
      // (function f() { requestAnimationFrame(f); obj.material.uniforms.dashTranslate.value += 0.01; })();

      // calculate vertex colors (to create gradient)
      const vertexColorArray = calcColorVertexArray(
        colorAccessor(arc), // single or array of colors
        state.arcCurveResolution, // numSegments
        useTube ? state.arcCircularResolution + 1 : 1 // num vertices per segment
      );

      // calculate vertex relative distances (for dashed lines)
      const vertexRelDistanceArray = calcVertexRelDistances(
        state.arcCurveResolution, // numSegments
        useTube ? state.arcCircularResolution + 1 : 1 // num vertices per segment
      );

      const applyUpdate = ({ stroke, ...curveD }) => {
        const curve = calcCurve(curveD);

        if (useTube) {
          obj.geometry && obj.geometry.dispose();
          obj.geometry = new THREE.TubeBufferGeometry(curve, state.arcCurveResolution, stroke / 2, state.arcCircularResolution);
        } else {
          obj.geometry.setFromPoints(curve.getPoints(state.arcCurveResolution));
        }

        obj.geometry.addAttribute('vertexColor', vertexColorArray);
        obj.geometry.addAttribute('vertexRelDistance', vertexRelDistanceArray);
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

    function calcColorVertexArray(colors, numSegments, numVerticesPerSegment = 1) {
      const numVerticesGroup = numSegments + 1; // one between every two segments and two at the ends

      let getVertexColor;
      if (colors instanceof Array) {
        // array of colors, interpolate at each step
        const colorScale = d3ScaleLinear()
          .domain(colors.map((_, idx) => idx / (colors.length - 1))) // same number of stops as colors
          .range(colors);

        getVertexColor = t => color2ShaderArr(colorScale(t));
      } else {
        // single color, use constant
        const vertexColor = color2ShaderArr(colors);
        getVertexColor = () => vertexColor;
      }

      const vertexColorArray = new THREE.Float32BufferAttribute(numVerticesGroup * 4 * numVerticesPerSegment, 4);

      for (let v = 0, l = numVerticesGroup; v < l; v++) {
        const vertexColor = getVertexColor(v / (l - 1));
        for (let s = 0; s < numVerticesPerSegment; s++) {
          vertexColorArray.set(vertexColor, (v * numVerticesPerSegment + s) * 4);
        }
      }

      return vertexColorArray;
    }

    function calcVertexRelDistances(numSegments, numVerticesPerSegment = 1) {
      const numVerticesGroup = numSegments + 1; // one between every two segments and two at the ends

      const vertexDistanceArray = new THREE.Float32BufferAttribute(numVerticesGroup * numVerticesPerSegment, 1);

      for (let v = 0, l = numVerticesGroup; v < l; v++) {
        const relDistance = v / (l - 1);
        for (let s = 0; s < numVerticesPerSegment; s++) {
          vertexDistanceArray.setX(v * numVerticesPerSegment + s, relDistance);
        }
      }

      return vertexDistanceArray;
    }
  }
});
