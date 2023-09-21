import {
  Mesh,
  MeshLambertMaterial,
  SphereGeometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Mesh,
    MeshLambertMaterial,
    SphereGeometry
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { scaleLinear } from 'd3-scale';
import { interpolateTurbo } from 'd3-scale-chromatic';
import { max } from 'd3-array';
import { color as d3Color } from 'd3-color';
import * as TWEEN from '@tweenjs/tween.js';
import yaOctree from 'yaot';

import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { array2BufferAttr, bufferAttr2Array } from '../utils/three-utils';
import { color2ShaderArr } from '../utils/color-utils';
import { cartesian2Polar, polar2Cartesian } from '../utils/coordTranslate';
import { getGeoKDE } from '../utils/kde';
import { GLOBE_RADIUS } from '../constants';

//

const RES_BW_FACTOR = 3.5; // divider of bandwidth to use in geometry resolution
const MIN_RESOLUTION = 0.1; // degrees
const BW_RADIUS_INFLUENCE = 3.5; // multiplier of bandwidth to use in octree for max radius of point influence

class PointsOctree {
  constructor(points, neighborhoodAngularDistance) {
    this.#points = points;
    this.#pntOctree = yaOctree();
    this.#pntOctree.init(points.map(d => [d.x, d.y, d.z]).flat());
    this.#distance = this.#getDistance(
      polar2Cartesian(0, 0),
      polar2Cartesian(0, Math.min(180, neighborhoodAngularDistance))
    );
  }

  getNearPoints(x, y, z) {
    return this.#pntOctree.intersectSphere(x, y, z, this.#distance).map(idx => this.#points[idx / 3]);
  }

  #getDistance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  #points;
  #pntOctree;
  #distance;
}

const defaultColorInterpolator = t => {
  const c = d3Color(interpolateTurbo(t)); // turbo, inferno
  c.opacity = Math.cbrt(t);
  return c.formatRgb();
};

export default Kapsule({
  props: {
    heatmapsData: { default: [] },
    heatmapPoints: { default: pnts => pnts },
    heatmapPointLat: { default: d => d[0] },
    heatmapPointLng: { default: d => d[1] },
    heatmapPointWeight: { default: 1 },
    heatmapBandwidth: { default: 4 }, // Gaussian kernel bandwidth, in angular degrees
    heatmapColorFn: { default: () => defaultColorInterpolator },
    heatmapColorSaturation: { default: 1.5 }, // multiplier for color scale max
    heatmapBaseAltitude: { default: 0.01 }, // in units of globe radius
    heatmapTopAltitude: {}, // in units of globe radius
    heatmapsTransitionDuration: { default: 0, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Accessors
    const pointsAccessor = accessorFn(state.heatmapPoints);
    const latPntAccessor = accessorFn(state.heatmapPointLat);
    const lngPntAccessor = accessorFn(state.heatmapPointLng);
    const weightPntAccessor = accessorFn(state.heatmapPointWeight);
    const bandwidthAccessor = accessorFn(state.heatmapBandwidth);
    const colorFnAccessor = accessorFn(state.heatmapColorFn);
    const saturationAccessor = accessorFn(state.heatmapColorSaturation);
    const baseAltitudeAccessor = accessorFn(state.heatmapBaseAltitude);
    const topAltitudeAccessor = accessorFn(state.heatmapTopAltitude);

    threeDigest(state.heatmapsData, state.scene, {
      createObj: d => {
        const obj = new THREE.Mesh(
          new THREE.SphereGeometry(GLOBE_RADIUS),
          new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })
        );

        obj.__globeObjType = 'heatmap'; // Add object type
        return obj;
      },
      updateObj: (obj, d) => {
        // Accessors
        const bandwidth = bandwidthAccessor(d);
        const colorFn = colorFnAccessor(d);
        const saturation = saturationAccessor(d);
        const baseAlt = baseAltitudeAccessor(d);
        const topAlt = topAltitudeAccessor(d);
        const pnts = pointsAccessor(d).map(pnt => {
          const lat = latPntAccessor(pnt);
          const lng = lngPntAccessor(pnt);
          const { x, y, z } = polar2Cartesian(lat, lng);
          return {
            x, y, z,
            lat, lng,
            weight: weightPntAccessor(pnt)
          }
        });

        // Check resolution
        const resolution = Math.max(MIN_RESOLUTION, bandwidth / RES_BW_FACTOR);
        const equatorNumSegments = Math.ceil(360 / (resolution || -1));
        if (obj.geometry.parameters.widthSegments !== equatorNumSegments) {
          obj.geometry.dispose();
          obj.geometry = new THREE.SphereGeometry(GLOBE_RADIUS, equatorNumSegments, equatorNumSegments / 2);
        }

        // Get vertex polar coordinates
        const vertexCoords = bufferAttr2Array(obj.geometry.getAttribute('position'));
        const vertexGeoCoords = vertexCoords.map(([x, y, z]) => {
          const { lng, lat } = cartesian2Polar({ x, y, z });
          return [lng, lat];
        });

        // Compute KDE
        const pntsOctree = new PointsOctree(pnts, bandwidth * BW_RADIUS_INFLUENCE);
        const kdeVals = vertexGeoCoords.map((vxCoords, idx) => {
          const [x, y, z] = vertexCoords[idx];
          return getGeoKDE(vxCoords, pntsOctree.getNearPoints(x, y, z), {
            latAccessor: d => d.lat,
            lngAccessor: d => d.lng,
            weightAccessor: d => d.weight,
            bandwidth
          });
        });

        // Animations
        const applyUpdate = td => {
          const { kdeVals, topAlt, saturation } = obj.__currentTargetD = td;
          const maxVal = max(kdeVals) || 1e-15;

          // Set vertex colors
          obj.geometry.setAttribute('color', array2BufferAttr(
            // normalization between [0, saturation]
            kdeVals.map(val => color2ShaderArr(colorFn(val / maxVal * saturation))),
            4
          ));

          // Set altitudes
          const altScale = scaleLinear([0, maxVal], [baseAlt, topAlt || baseAlt]);
          obj.geometry.setAttribute('position', array2BufferAttr(
            kdeVals.map((val, idx) => {
              const [lng, lat] = vertexGeoCoords[idx];
              const alt = altScale(val);
              const p = polar2Cartesian(lat, lng, alt);
              return [p.x, p.y, p.z];
            }),
            3
          ));
        };

        const targetD = { kdeVals, topAlt, saturation };
        const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, {
          kdeVals: kdeVals.map(() => 0),
          topAlt: !topAlt ? topAlt : baseAlt,
          saturation: 0.5
        });
        // do not interpolate between different length arrays
        currentTargetD.kdeVals.length !== kdeVals.length && (currentTargetD.kdeVals = kdeVals.slice());

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
          if (!state.heatmapsTransitionDuration || state.heatmapsTransitionDuration < 0) {
            // set final position
            applyUpdate(targetD);
          } else {
            // animate
            new TWEEN.Tween(currentTargetD)
              .to(targetD, state.heatmapsTransitionDuration)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .onUpdate(applyUpdate)
              .start();
          }
        }
      },
    });
  }
});
