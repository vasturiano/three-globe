import {
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    DoubleSide,
    Group,
    Mesh,
    MeshLambertMaterial
  };

import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { polyfill, h3ToGeo, h3ToGeoBoundary } from 'h3-js';
import TWEEN from '@tweenjs/tween.js';

import { colorAlpha } from '../utils/color-utils';
import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    hexPolygonsData: { default: [] },
    hexPolygonGeoJsonGeometry: { default: 'geometry' },
    hexPolygonColor: { default: () => '#ffffaa' },
    hexPolygonAltitude: { default: 0.001 }, // in units of globe radius
    hexPolygonResolution: { default: 3 }, // 0-15. Level 0 partitions the earth in 122 (mostly) hexagonal cells. Each subsequent level sub-divides the previous in roughly 7 hexagons.
    hexPolygonMargin: { default: 0.2 }, // in fraction of hex diameter
    hexPolygonsTransitionDuration: { default: 0, triggerUpdate: false } // ms
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Accessors
    const geoJsonAccessor = accessorFn(state.hexPolygonGeoJsonGeometry);
    const colorAccessor = accessorFn(state.hexPolygonColor);
    const altitudeAccessor = accessorFn(state.hexPolygonAltitude);
    const resolutionAccessor = accessorFn(state.hexPolygonResolution);
    const marginAccessor = accessorFn(state.hexPolygonMargin);

    threeDigest(state.hexPolygonsData, state.scene, {
      createObj: d => {
        const obj = new THREE.Group();

        obj.__globeObjType = 'hexPolygon'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        const geoJson = geoJsonAccessor(d);
        const h3Res = resolutionAccessor(d);
        const alt = altitudeAccessor(d);
        const margin = Math.max(0, Math.min(1, +marginAccessor(d)));

        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        const material = new THREE.MeshLambertMaterial({
          color,
          transparent: opacity < 1,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: true
        });

        const h3Idxs = [];

        if (geoJson.type === 'Polygon') {
          h3Idxs.push(...polyfill(geoJson.coordinates, h3Res, true));
        } else if (geoJson.type === 'MultiPolygon') {
          geoJson.coordinates
            .forEach(coords => h3Idxs.push(...polyfill(coords, h3Res, true)));
        } else {
          console.warn(`Unsupported GeoJson geometry type: ${geoJson.type}. Skipping geometry...`);
        }

        threeDigest(h3Idxs.map(h3Idx => ({ h3Idx })), obj, {
          idAccessor: d => d.h3Idx,
          createObj: ({ h3Idx }) => {
            const obj = new THREE.Mesh();
            obj.__hexCenter = h3ToGeo(h3Idx);
            obj.__hexGeoJson = h3ToGeoBoundary(h3Idx, true);

            // stitch longitudes at the anti-meridian
            const centerLng = obj.__hexCenter[1];
            obj.__hexGeoJson.forEach(d => {
              const edgeLng = d[0];
              if (Math.abs(centerLng - edgeLng) > 170) {
                // normalize large lng distances
                d[0] += (centerLng > edgeLng ? 360 : -360);
              }
            });

            return obj;
          },
          updateObj: obj => {
            // update material
            obj.material = material;

            const applyUpdate = td => {
              const { alt, margin } = obj.__currentTargetD = td;

              // compute new geojson with relative margin
              const relNum = (st, end, rat) => st - (st - end) * rat;
              const [clat, clng] = obj.__hexCenter;
              const geoJson = margin === 0
                ? obj.__hexGeoJson
                : obj.__hexGeoJson.map(([elng, elat]) => [[elng, clng], [elat, clat]].map(([st, end]) => relNum(st, end, margin)));

              obj.geometry = new ConicPolygonGeometry([geoJson], GLOBE_RADIUS, GLOBE_RADIUS * (1 + alt), false);
            };

            const targetD = { alt, margin };

            const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { alt: -1e-3 });

            if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
              if (!state.hexPolygonsTransitionDuration || state.hexPolygonsTransitionDuration < 0) {
                // set final position
                applyUpdate(targetD);
              } else {
                // animate
                new TWEEN.Tween(currentTargetD)
                  .to(targetD, state.hexPolygonsTransitionDuration)
                  .easing(TWEEN.Easing.Quadratic.InOut)
                  .onUpdate(applyUpdate)
                  .start();
              }
            }
          }
        });

      }
    });
  }
});
