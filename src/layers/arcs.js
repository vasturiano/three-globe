import {
  BufferGeometry,
  CubicBezierCurve3,
  Curve,
  Group,
  Line,
  Mesh,
  NormalBlending,
  QuadraticBezierCurve3,
  ShaderMaterial,
  TubeGeometry,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry,
    CubicBezierCurve3,
    Curve,
    Group,
    Line,
    Mesh,
    NormalBlending,
    QuadraticBezierCurve3,
    ShaderMaterial,
    TubeGeometry,
    Vector3
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { Tween, Easing } from '@tweenjs/tween.js';
import _FrameTicker from 'frame-ticker';
const FrameTicker = _FrameTicker.default || _FrameTicker;
import { geoDistance, geoInterpolate } from 'd3-geo';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import ThreeDigest from '../utils/digest';
import { emptyObject } from '../utils/gc';
import { color2ShaderArr } from '../utils/color-utils';
import { array2BufferAttr } from '../utils/three-utils';
import { polar2Cartesian } from '../utils/coordTranslate';
import { dashedLineShaders } from '../utils/shaders';

//

export default Kapsule({
  props: {
    arcsData: { default: [] },
    arcStartLat: { default: 'startLat' },
    arcStartLng: { default: 'startLng' },
    arcEndLat: { default: 'endLat' },
    arcEndLng: { default: 'endLng' },
    arcColor: { default: () => '#ffffaa' }, // single color, array of colors or color interpolation fn
    arcAltitude: {}, // in units of globe radius
    arcAltitudeAutoScale: { default: 0.5 }, // scale altitude proportional to great-arc distance between the two points
    arcStroke: {}, // in deg
    arcCurveResolution: { default: 64, triggerUpdate: false }, // how many straight segments in the curve
    arcCircularResolution: { default: 6, triggerUpdate: false }, // how many slice segments in the tube's circumference
    arcDashLength: { default: 1 }, // in units of line length
    arcDashGap: { default: 0 },
    arcDashInitialGap: { default: 0 },
    arcDashAnimateTime: { default: 0 }, // ms
    arcsTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  methods: {
    pauseAnimation: function(state) {
      state.ticker?.pause();
    },
    resumeAnimation: function(state) {
      state.ticker?.resume();
    },
    _destructor: function(state) {
      state.sharedMaterial.dispose();
      state.ticker?.dispose();
    }
  },

  stateInit: ({ tweenGroup }) => ({
    tweenGroup,
    ticker: new FrameTicker(),
    sharedMaterial: new THREE.ShaderMaterial({
      ...(dashedLineShaders()),
      transparent: true,
      blending: THREE.NormalBlending
    })
  }),

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjArc' })
      .onCreateObj(() => {
        const obj = new THREE.Group(); // populated in updateObj

        obj.__globeObjType = 'arc'; // Add object type
        return obj;
      });

    // Kick-off dash animations
    state.ticker.onTick.add((_, timeDelta) => {
      state.dataMapper.entries()
        .map(([, obj]) => obj)
        .filter(o => o.children.length && o.children[0].material && o.children[0].__dashAnimateStep)
        .forEach(o => {
          const obj = o.children[0];
          const step = obj.__dashAnimateStep * timeDelta;
          const curTranslate = obj.material.uniforms.dashTranslate.value % 1e9; // reset after 1B loops
          obj.material.uniforms.dashTranslate.value = curTranslate + step;
        })
    });
  },

  update(state) {
    // Data accessors
    const startLatAccessor = accessorFn(state.arcStartLat);
    const startLngAccessor = accessorFn(state.arcStartLng);
    const endLatAccessor = accessorFn(state.arcEndLat);
    const endLngAccessor = accessorFn(state.arcEndLng);
    const altitudeAccessor = accessorFn(state.arcAltitude);
    const altitudeAutoScaleAccessor = accessorFn(state.arcAltitudeAutoScale);
    const strokeAccessor = accessorFn(state.arcStroke);
    const colorAccessor = accessorFn(state.arcColor);
    const dashLengthAccessor = accessorFn(state.arcDashLength);
    const dashGapAccessor = accessorFn(state.arcDashGap);
    const dashInitialGapAccessor = accessorFn(state.arcDashInitialGap);
    const dashAnimateTimeAccessor = accessorFn(state.arcDashAnimateTime);

    state.dataMapper
      .onUpdateObj((group, arc) => {
        const stroke = strokeAccessor(arc);
        const useTube = stroke !== null && stroke !== undefined;

        if (!group.children.length || useTube !== (group.children[0].type === 'Mesh')) {
          // create or swap object types
          emptyObject(group);

          const obj = useTube
            ? new THREE.Mesh()
            : new THREE.Line(new THREE.BufferGeometry());

          obj.material = state.sharedMaterial.clone(); // Separate material instance per object to have dedicated uniforms (but shared shaders)

          group.add(obj);
        }

        const obj = group.children[0];

        // set dash uniforms
        Object.assign(obj.material.uniforms, {
          dashSize: { value: dashLengthAccessor(arc)},
          gapSize: { value: dashGapAccessor(arc)},
          dashOffset: { value: dashInitialGapAccessor(arc)}
        });

        // set dash animation step
        const dashAnimateTime = dashAnimateTimeAccessor(arc);
        obj.__dashAnimateStep = dashAnimateTime > 0 ? 1000 / dashAnimateTime : 0; // per second

        // calculate vertex colors (to create gradient)
        const vertexColorArray = calcColorVertexArray(
          colorAccessor(arc), // single, array of colors or interpolator
          state.arcCurveResolution, // numSegments
          useTube ? state.arcCircularResolution + 1 : 1 // num vertices per segment
        );

        // calculate vertex relative distances (for dashed lines)
        const vertexRelDistanceArray = calcVertexRelDistances(
          state.arcCurveResolution, // numSegments
          useTube ? state.arcCircularResolution + 1 : 1, // num vertices per segment
          true // run from end to start, to animate in the correct direction
        );

        obj.geometry.setAttribute('color', vertexColorArray);
        obj.geometry.setAttribute('relDistance', vertexRelDistanceArray);

        const applyUpdate = td => {
          const { stroke, ...curveD } = arc.__currentTargetD = td;

          const curve = calcCurve(curveD);

          if (useTube) {
            obj.geometry && obj.geometry.dispose();
            obj.geometry = new THREE.TubeGeometry(curve, state.arcCurveResolution, stroke / 2, state.arcCircularResolution);
            obj.geometry.setAttribute('color', vertexColorArray);
            obj.geometry.setAttribute('relDistance', vertexRelDistanceArray);
          } else {
            obj.geometry.setFromPoints(curve.getPoints(state.arcCurveResolution));
          }
        };

        const targetD = {
          stroke,
          alt: altitudeAccessor(arc),
          altAutoScale: +altitudeAutoScaleAccessor(arc),
          startLat: +startLatAccessor(arc),
          startLng: +startLngAccessor(arc),
          endLat: +endLatAccessor(arc),
          endLng: +endLngAccessor(arc)
        };

        const currentTargetD = arc.__currentTargetD || Object.assign({}, targetD, { altAutoScale: -1e-3 });

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
          if (!state.arcsTransitionDuration || state.arcsTransitionDuration < 0) {
            // set final position
            applyUpdate(targetD);
          } else {
            // animate
            state.tweenGroup.add(new Tween(currentTargetD)
              .to(targetD, state.arcsTransitionDuration)
              .easing(Easing.Quadratic.InOut)
              .onUpdate(applyUpdate)
              .start()
            );
          }
        }
      })
      .digest(state.arcsData);

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

      if (altitude) {
        const interpolate = geoInterpolate(startPnt, endPnt);
        const [m1Pnt, m2Pnt] = [0.25, 0.75].map(t => [...interpolate(t), altitude * 1.5]);
        const curve = new THREE.CubicBezierCurve3(...[startPnt, m1Pnt, m2Pnt, endPnt].map(getVec));

        //const mPnt = [...interpolate(0.5), altitude * 2];
        //curve = new THREE.QuadraticBezierCurve3(...[startPnt, mPnt, endPnt].map(getVec));

        return curve;
      } else {
        // ground line
        const alt = 0.001; // slightly above the ground to prevent occlusion
        return calcSphereArc(...[[...startPnt, alt], [...endPnt, alt]].map(getVec));
      }

      //

      function calcSphereArc(startVec, endVec) {
        const angle = startVec.angleTo(endVec);
        const getGreatCirclePoint = angle === 0
          ? () => startVec.clone() // points exactly overlap
          : t => new THREE.Vector3().addVectors(
            startVec.clone().multiplyScalar(Math.sin( (1 - t) * angle)),
            endVec.clone().multiplyScalar(Math.sin(t  * angle))
          ).divideScalar(Math.sin(angle));

        const sphereArc = new THREE.Curve();
        sphereArc.getPoint = getGreatCirclePoint;

        return sphereArc;
      }
    }

    function calcColorVertexArray(colors, numSegments, numVerticesPerSegment = 1) {
      const numVerticesGroup = numSegments + 1; // one between every two segments and two at the ends

      let getVertexColor;
      if (colors instanceof Array || colors instanceof Function) {
        const colorInterpolator = (colors instanceof Array)
          ? d3ScaleLinear() // array of colors, interpolate at each step
            .domain(colors.map((_, idx) => idx / (colors.length - 1))) // same number of stops as colors
            .range(colors)
          : colors; // already interpolator fn

        getVertexColor = t => color2ShaderArr(colorInterpolator(t), true, true);
      } else {
        // single color, use constant
        const vertexColor = color2ShaderArr(colors, true, true);
        getVertexColor = () => vertexColor;
      }

      const vertexColors = [];
      for (let v = 0, l = numVerticesGroup; v < l; v++) {
        const vertexColor = getVertexColor(v / (l - 1));
        for (let s = 0; s < numVerticesPerSegment; s++) {
          vertexColors.push(vertexColor);
        }
      }

      return array2BufferAttr(vertexColors, 4);
    }

    function calcVertexRelDistances(numSegments, numVerticesPerSegment = 1, invert = false) {
      const numVerticesGroup = numSegments + 1; // one between every two segments and two at the ends

      const vertexDistances = [];
      for (let v = 0, l = numVerticesGroup; v < l; v++) {
        const relDistance = v / (l - 1);
        for (let s = 0; s < numVerticesPerSegment; s++) {
          vertexDistances.push(relDistance);
        }
      }
      invert && vertexDistances.reverse();

      return array2BufferAttr(vertexDistances, 1);
    }
  }
});
