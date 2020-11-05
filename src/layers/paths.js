import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  NoColors,
  ShaderMaterial,
  Vector3,
  VertexColors
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    AdditiveBlending,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Group,
    Line,
    NoColors,
    ShaderMaterial,
    Vector3,
    VertexColors
  };

import { Line2, LineGeometry, LineMaterial } from 'three-fatline';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';
import FrameTicker from 'frame-ticker';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import threeDigest from '../utils/digest';
import { emptyObject } from '../utils/gc';
import { color2ShaderArr, colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { polar2Cartesian } from '../utils/coordTranslate';
import { interpolateVectors } from '../utils/interpolate';

//

// support both modes for backwards threejs compatibility
const setAttributeFn = new THREE.BufferGeometry().setAttribute ? 'setAttribute' : 'addAttribute';

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
    pathResolution: { default: 2 }, // in deg
    pathColor: { default: () => '#ffffaa' },
    pathStroke: {}, // in deg
    pathDashLength: { default: 1 }, // in units of line length
    pathDashGap: { default: 0 },
    pathDashInitialGap: { default: 0 },
    pathDashAnimateTime: { default: 0 }, // ms
    pathTransitionDuration: { default: 1000, triggerUpdate: false }, // ms
    rendererSize: {} // necessary to set correct fatline proportions
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    // Kick-off dash animations
    new FrameTicker().onTick.add((_, timeDelta) => {
      state.pathsData
        .filter(d => d.__threeObj && d.__threeObj.children.length && d.__threeObj.children[0].material && d.__threeObj.children[0].__dashAnimateStep)
        .forEach(d => {
          const obj = d.__threeObj.children[0];
          const step = obj.__dashAnimateStep * timeDelta;

          if (obj.type === 'Line') {
            const curTranslate = obj.material.uniforms.dashTranslate.value % 1e9; // reset after 1B loops
            obj.material.uniforms.dashTranslate.value = curTranslate + step;
          } else if (obj.type === 'Line2') { // fatline
            let offset = obj.material.dashOffset - step;
            const dashLength = obj.material.dashSize + obj.material.gapSize;
            while (offset <= -dashLength) offset += dashLength; // cycle within dash length
            obj.material.dashOffset = offset;
          }
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

    const sharedShaderMaterial = new THREE.ShaderMaterial({
      ...gradientShaders,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    threeDigest(state.pathsData, state.scene, {
      createObj: () => {
        const obj = new THREE.Group(); // populated in updateObj

        obj.__globeObjType = 'path'; // Add object type
        return obj;
      },
      updateObj: (group, path) => {
        const stroke = strokeAccessor(path);
        const useFatLine = stroke !== null && stroke !== undefined;

        if (!group.children.length || useFatLine === (group.children[0].type === 'Line')) {
          // create or swap object types
          emptyObject(group);

          const obj = useFatLine
            ? new Line2(new LineGeometry(), new LineMaterial())
            : new THREE.Line(
              new THREE.BufferGeometry(),
              sharedShaderMaterial.clone() // Separate material instance per object to have dedicated uniforms (but shared shaders)
            );

          group.add(obj);
        }

        const obj = group.children[0];

        const points = calcPath(pointsAccessor(path), pointLatAccessor, pointLngAccessor, pointAltAccessor, state.pathResolution);

        // set dash animation step
        const dashAnimateTime = dashAnimateTimeAccessor(path);
        obj.__dashAnimateStep = dashAnimateTime > 0 ? 1000 / dashAnimateTime : 0; // per second

        if (!useFatLine) {
          // set dash uniforms
          Object.assign(obj.material.uniforms, {
            dashSize: { value: dashLengthAccessor(path)},
            gapSize: { value: dashGapAccessor(path)},
            dashOffset: { value: dashInitialGapAccessor(path)}
          });

          // calculate vertex colors (to create gradient)
          const vertexColorArray = calcColorVertexArray(
            colorAccessor(path), // single or array of colors
            points.length // numSegments
          );

          // calculate vertex relative distances (for dashed lines)
          const vertexRelDistanceArray = calcVertexRelDistances(
            points.length, // numSegments
            1, // num vertices per segment
            true // run from end to start, to animate in the correct direction
          );

          obj.geometry[setAttributeFn]('vertexColor', vertexColorArray);
          obj.geometry[setAttributeFn]('vertexRelDistance', vertexRelDistanceArray);
        } else { // fat lines
          obj.material.resolution = state.rendererSize;

          { // set dash styling
            const dashLength = dashLengthAccessor(path);
            const dashGap = dashGapAccessor(path);
            const dashInitialGap = dashInitialGapAccessor(path);

            obj.material.dashed = dashGap > 0;

            // temp hack to activate line dashes
            obj.material.dashed
              ? obj.material.defines.USE_DASH = ""
              : delete obj.material.defines.USE_DASH;

            if (obj.material.dashed) {
              obj.material.dashScale = 1 / calcLineDistance(points); // dash sizes relative to full line length

              obj.material.dashSize = dashLength;
              obj.material.gapSize = dashGap;
              obj.material.dashOffset = -dashInitialGap;
            }
          }

          { // set line colors
            const colors = colorAccessor(path);

            if (colors instanceof Array) {
              // calculate vertex colors (to create gradient)
              const vertexColorArray = calcColorVertexArray(
                colorAccessor(path), // single or array of colors
                points.length - 1, // numSegments
                1, // num vertices per segment
                false
              );

              obj.geometry.setColors(vertexColorArray.array);

              obj.material.vertexColors = THREE.VertexColors;
            } else {
              // single color
              const color = colors;
              const opacity = colorAlpha(color);

              obj.material.color = new THREE.Color(colorStr2Hex(color));
              obj.material.transparent = opacity < 1;
              obj.material.opacity = opacity;

              obj.material.vertexColors = THREE.NoColors;
            }
          }

          obj.material.needsUpdate = true;
        }

        // animate from start to finish by default
        const pointsInterpolator = interpolateVectors((path.__currentTargetD && path.__currentTargetD.points) || [points[0]], points);

        const applyUpdate = td => {
          const { stroke, interpolK } = path.__currentTargetD = td;

          const kPoints = path.__currentTargetD.points = pointsInterpolator(interpolK);

          if (useFatLine) {
            obj.geometry.setPositions([].concat(...kPoints.map(({ x, y, z }) => [x, y, z])));
            obj.material.linewidth = stroke;

            // necessary for dashed lines
            obj.material.dashed && obj.computeLineDistances();
          } else {
            obj.geometry.setFromPoints(kPoints);
            obj.geometry.computeBoundingSphere();
          }
        };

        const targetD = { stroke, interpolK: 1 };

        const currentTargetD = Object.assign({}, path.__currentTargetD || targetD, { interpolK: 0 });

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
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
        }
      }
    });

    //

    function calcLineDistance(pnts) {
      let totalDist = 0;
      let prevPnt;
      pnts.forEach(pnt => {
        prevPnt && (totalDist += prevPnt.distanceTo(pnt));
        prevPnt = pnt;
      });

      return totalDist;
    }

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

    function calcColorVertexArray(colors, numSegments, numVerticesPerSegment = 1, includeAlpha = true) {
      const numVerticesGroup = numSegments + 1; // one between every two segments and two at the ends

      let getVertexColor;
      if (colors instanceof Array) {
        // array of colors, interpolate at each step
        const colorScale = d3ScaleLinear()
          .domain(colors.map((_, idx) => idx / (colors.length - 1))) // same number of stops as colors
          .range(colors);

        getVertexColor = t => color2ShaderArr(colorScale(t), includeAlpha);
      } else {
        // single color, use constant
        const vertexColor = color2ShaderArr(colors, includeAlpha);
        getVertexColor = () => vertexColor;
      }

      const numArgs = includeAlpha ? 4 : 3;
      const vertexColorArray = new THREE.Float32BufferAttribute(numVerticesGroup * numArgs * numVerticesPerSegment, numArgs);

      for (let v = 0, l = numVerticesGroup; v < l; v++) {
        const vertexColor = getVertexColor(v / (l - 1));
        for (let s = 0; s < numVerticesPerSegment; s++) {
          vertexColorArray.set(vertexColor, (v * numVerticesPerSegment + s) * numArgs);
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