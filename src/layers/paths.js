import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  Mesh,
  ShaderMaterial,
  TubeBufferGeometry,
  Vector3
} from 'three';

import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    AdditiveBlending,
    BufferGeometry,
    Float32BufferAttribute,
    Line,
    Mesh,
    ShaderMaterial,
    TubeBufferGeometry,
    Vector3
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';
import FrameTicker from 'frame-ticker';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import threeDigest from '../utils/digest';
import { emptyObject } from '../utils/gc';
import { color2ShaderArr } from '../utils/color-utils';
import { polar2Cartesian } from '../utils/coordTranslate';

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
    pathsData: { default: [] },
    pathPoints: { default: pnts => pnts },
    pathPointLat: { default: arr => arr[0] },
    pathPointLng: { default: arr => arr[1] },
    pathPointAlt: { default: 1e-3 },
    pathAngularResolution: { default: 2 },
    pathColor: { default: () => '#ffffaa' },
    pathStroke: {}, // in deg
    pathStrokeResolution: { default: 6, triggerUpdate: false }, // how many slice segments in the tube's circumference
    pathDashLength: { default: 1 }, // in units of line length
    pathDashGap: { default: 0 },
    pathDashInitialGap: { default: 0 },
    pathDashAnimateTime: { default: 0 }, // ms
    pathTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    // Kick-off dash animations
    new FrameTicker().onTick.add((_, timeDelta) => {
      state.pathsData
        .filter(d => d.__threeObj && d.__threeObj.material && d.__threeObj.__dashAnimateStep)
        .forEach(d => {
          const obj = d.__threeObj;
          const step = obj.__dashAnimateStep * timeDelta;
          const curTranslate = obj.material.uniforms.dashTranslate.value % 1e9; // reset after 1B loops
          obj.material.uniforms.dashTranslate.value = curTranslate + step;
        })
    });
  },

  update(state) {
    // Data accessors
    const pointsAccessor = accessorFn(state.pathPoints);
    const pointLatAccessor = accessorFn(state.pathPointLat);
    const pointLngAccessor = accessorFn(state.pathPointLng);
    const pointAltAccessor = accessorFn(state.pathPointAlt);
    const strokeAccessor = accessorFn(state.pathStroke);
    const colorAccessor = accessorFn(state.pathColor);
    const dashLengthAccessor = accessorFn(state.pathDashLength);
    const dashGapAccessor = accessorFn(state.pathDashGap);
    const dashInitialGapAccessor = accessorFn(state.pathDashInitialGap);
    const dashAnimateTimeAccessor = accessorFn(state.pathDashAnimateTime);

    const sharedMaterial = new THREE.ShaderMaterial({
      ...gradientShaders,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    threeDigest(state.pathsData, state.scene, {
      createObj: path => {
        const stroke = strokeAccessor(path);
        const useTube = stroke !== null && stroke !== undefined;

        const obj = useTube
          ? new THREE.Mesh()
          : new THREE.Line(new THREE.BufferGeometry());

        obj.material = sharedMaterial.clone(); // Separate material instance per object to have dedicated uniforms (but shared shaders)

        obj.__globeObjType = 'path'; // Add object type

        return obj;
      },
      updateObj: (obj, path) => {
        const stroke = strokeAccessor(path);
        const useTube = stroke !== null && stroke !== undefined;

        // set dash uniforms
        Object.assign(obj.material.uniforms, {
          dashSize: { value: dashLengthAccessor(path)},
          gapSize: { value: dashGapAccessor(path)},
          dashOffset: { value: dashInitialGapAccessor(path)}
        });

        // set dash animation step
        const dashAnimateTime = dashAnimateTimeAccessor(path);
        obj.__dashAnimateStep = dashAnimateTime > 0 ? 1000 / dashAnimateTime : 0; // per second

        const points = calcPath(pointsAccessor(path), pointLatAccessor, pointLngAccessor, pointAltAccessor, state.pathAngularResolution);

        // calculate vertex colors (to create gradient)
        const vertexColorArray = calcColorVertexArray(
          colorAccessor(path), // single or array of colors
          points.length, // numSegments
          useTube ? state.pathStrokeResolution + 1 : 1 // num vertices per segment
        );

        // calculate vertex relative distances (for dashed lines)
        const vertexRelDistanceArray = calcVertexRelDistances(
          points.length, // numSegments
          useTube ? state.pathStrokeResolution + 1 : 1, // num vertices per segment
          true // run from end to start, to animate in the correct direction
        );

        obj.geometry.addAttribute('vertexColor', vertexColorArray);
        obj.geometry.addAttribute('vertexRelDistance', vertexRelDistanceArray);

        const applyUpdate = td => {
          const { stroke } = path.__currentTargetD = td;

          if (useTube) {
            obj.geometry && obj.geometry.dispose();
            obj.geometry = new THREE.TubeBufferGeometry(points, points.length, stroke / 2, state.pathStrokeResolution);
            obj.geometry.addAttribute('vertexColor', vertexColorArray);
            obj.geometry.addAttribute('vertexRelDistance', vertexRelDistanceArray);
          } else {
            obj.geometry.setFromPoints(points);
          }
        };

        const targetD = {
          stroke
        };

        const currentTargetD = path.__currentTargetD || Object.assign({}, targetD);

        //if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
          if (!state.pathTransitionDuration || state.pathTransitionDuration < 0) {
            // set final position
            applyUpdate(targetD);
          } else {
            // animate
            new TWEEN.Tween(currentTargetD)
              .to(targetD, state.pathTransitionDuration)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .onUpdate(applyUpdate)
              .start();
          }
        //}
      }
    });

    //

    function calcPath(points, latAccessor, lngAccessor, altAccessor, angularResolution) {
      const getInterpolatedVals = (start, end, numPnts) => {
        const result = [];

        for (let i=1; i <= numPnts; i++) {
          result.push(start + (end - start) * i / (numPnts + 1));
        }

        return result;
      };

      const interpolateLine = (lineCoords = [], maxDegDistance = 1) => {
        const result = [];

        let prevPnt = null;
        lineCoords.forEach(pnt => {
          if (prevPnt) {
            const dist = Math.sqrt(Math.pow(pnt[0] - prevPnt[0], 2) + Math.pow(pnt[1] - prevPnt[1], 2));

            if (dist > maxDegDistance) {
              const numAdditionalPnts = Math.floor(dist / maxDegDistance);

              const lats = getInterpolatedVals(prevPnt[0], pnt[0], numAdditionalPnts);
              const lngs = getInterpolatedVals(prevPnt[1], pnt[1], numAdditionalPnts);
              const alts = getInterpolatedVals(prevPnt[2], pnt[2], numAdditionalPnts);

              for (let i=0, len=lats.length; i<len; i++) {
                result.push([lats[i], lngs[i], alts[i]]);
              }
            }
          }

          result.push(prevPnt = pnt);
        });

        return result;
      };

      const getVec = ([lat, lng, alt]) => {
        const { x, y, z } = polar2Cartesian(lat, lng, alt);
        return new THREE.Vector3(x, y, z);
      };

      return interpolateLine(
        points.map(pnt => [latAccessor(pnt), lngAccessor(pnt), altAccessor(pnt)]),
        angularResolution
      ).map(getVec);
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

    function calcVertexRelDistances(numSegments, numVerticesPerSegment = 1, invert = false) {
      const numVerticesGroup = numSegments + 1; // one between every two segments and two at the ends
      const arrLen = numVerticesGroup * numVerticesPerSegment;

      const vertexDistanceArray = new THREE.Float32BufferAttribute(arrLen, 1);

      for (let v = 0, l = numVerticesGroup; v < l; v++) {
        const relDistance = v / (l - 1);
        for (let s = 0; s < numVerticesPerSegment; s++) {
          const idx = v * numVerticesPerSegment + s;
          const pos = invert ? arrLen - 1 - idx :idx;
          vertexDistanceArray.setX(pos, relDistance);
        }
      }

      return vertexDistanceArray;
    }
  }
});