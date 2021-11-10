import {
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Color,
    Group,
    Line,
    LineBasicMaterial,
    Vector3
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import TWEEN from '@tweenjs/tween.js';
import FrameTicker from 'frame-ticker';
import { scaleLinear as d3ScaleLinear } from 'd3-scale';

import threeDigest from '../utils/digest';
import { deallocate, emptyObject } from '../utils/gc';
import { polar2Cartesian } from '../utils/coordTranslate';
import { colorStr2Hex, colorAlpha, setMaterialOpacity } from '../utils/color-utils';
import CircleLineGeometry from '../utils/CircleLineGeometry';
import { GLOBE_RADIUS } from '../constants';

export default Kapsule({
  props: {
    ringsData: { default: [] },
    ringLat: { default: 'lat' },
    ringLng: { default: 'lng' },
    ringAltitude: { default: 1.5e-3 },
    ringColor: { default: () => '#ffffaa', triggerUpdate: false }, // single color, array of colors or color interpolation fn
    ringResolution: { default: 64, triggerUpdate: false }, // how many slice segments in each circle's circumference
    ringMaxRadius: { default: 2, triggerUpdate: false }, // degrees
    ringPropagationSpeed: { default: 1, triggerUpdate: false }, // degrees/s
    ringRepeatPeriod: { default: 700, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    new FrameTicker().onTick.add((time) => {
      if (!state.ringsData.length) return;

      // Data accessors
      const colorAccessor = accessorFn(state.ringColor);
      const altitudeAccessor = accessorFn(state.ringAltitude);
      const maxRadiusAccessor = accessorFn(state.ringMaxRadius);
      const propagationSpeedAccessor = accessorFn(state.ringPropagationSpeed);
      const repeatPeriodAccessor = accessorFn(state.ringRepeatPeriod);

      state.ringsData
        .filter(d => d.__threeObj)
        .forEach(d => {
          const obj = d.__threeObj;
          if ((obj.__nextRingTime || 0) <= time) {
            // time to add a new ring
            const periodSecs = repeatPeriodAccessor(d) / 1000;
            obj.__nextRingTime = time + (periodSecs <= 0 ? Infinity : periodSecs);

            const circleObj = new THREE.Line(
              new CircleLineGeometry(1, state.ringResolution),
              new THREE.LineBasicMaterial()
            );

            const colors = colorAccessor(d);
            const isMultiColor = colors instanceof Array || colors instanceof Function;
            let colorInterpolator;
            if (!isMultiColor) {
              // set only once
              circleObj.material.color = new THREE.Color(colorStr2Hex(colors));
              setMaterialOpacity(circleObj.material, colorAlpha(colors));
            } else {
              if (colors instanceof Array) {
                colorInterpolator = d3ScaleLinear()
                  .domain(colors.map((_, idx) => idx / (colors.length - 1))) // same number of stops as colors
                  .range(colors);
                circleObj.material.transparent = colors.some(c => colorAlpha(c) < 1);
              } else {
                colorInterpolator = colors;
                circleObj.material.transparent = true;
              }
            }

            const curveR = GLOBE_RADIUS * (1 + altitudeAccessor(d));
            const maxRadius = maxRadiusAccessor(d); // in degrees
            const maxAngle = maxRadius * Math.PI / 180; // in radians
            const propagationSpeed = propagationSpeedAccessor(d);
            const isReverse = propagationSpeed <= 0;

            const updateFn = ({ t }) => {
              const ang = (isReverse ? 1 - t : t) * maxAngle;
              circleObj.scale.x = circleObj.scale.y = curveR * Math.sin(ang);
              circleObj.position.z = curveR * (1 - Math.cos(ang));

              if (isMultiColor) {
                const color = colorInterpolator(t);
                circleObj.material.color = new THREE.Color(colorStr2Hex(color));
                circleObj.material.transparent && (circleObj.material.opacity = colorAlpha(color));
              }
            };

            if (propagationSpeed === 0) {
              updateFn({ t: 0 });
              obj.add(circleObj);
            } else {
              const transitionTime = Math.abs(maxRadius / propagationSpeed) * 1000;
              new TWEEN.Tween({ t: 0 })
                .to({ t: 1 }, transitionTime)
                .onUpdate(updateFn)
                .onStart(() => obj.add(circleObj))
                .onComplete(() => {
                  obj.remove(circleObj);
                  deallocate(circleObj);
                })
                .start();
            }
          }
        })
    });
  },

  update(state) {
    // Data accessors
    const latAccessor = accessorFn(state.ringLat);
    const lngAccessor = accessorFn(state.ringLng);
    const altitudeAccessor = accessorFn(state.ringAltitude);

    const globeCenter = state.scene.localToWorld(new THREE.Vector3(0, 0, 0)); // translate from local to world coords

    threeDigest(state.ringsData, state.scene,
      {
        createObj: () => {
          const obj = new THREE.Group();

          obj.__globeObjType = 'ring'; // Add object type
          return obj;
        },
        updateObj: (obj, d) => {
          const lat = latAccessor(d);
          const lng = lngAccessor(d);
          const alt = altitudeAccessor(d);

          // position & orientate inwards
          Object.assign(obj.position, polar2Cartesian(lat, lng, alt));
          obj.lookAt(globeCenter);
        }
      },
      { removeDelay: 30000 } // wait until all rings are gone
    )
  }
});
