import {
  DoubleSide,
  Geometry,
  Mesh,
  MeshLambertMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    DoubleSide,
    Geometry,
    Mesh,
    MeshLambertMaterial
  };

import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { polyfill, h3ToGeo, h3ToGeoBoundary } from 'h3-js';
import TWEEN from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
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
    hexPolygonCurvatureResolution: { default: 5 }, // in angular degrees
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
    const curvatureResolutionAccessor = accessorFn(state.hexPolygonCurvatureResolution);

    threeDigest(state.hexPolygonsData, state.scene, {
      createObj: d => {
        const obj = new THREE.Mesh(
          undefined,
          new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })
        );

        obj.__globeObjType = 'hexPolygon'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        const geoJson = geoJsonAccessor(d);
        const h3Res = resolutionAccessor(d);
        const alt = altitudeAccessor(d);
        const margin = Math.max(0, Math.min(1, +marginAccessor(d)));
        const curvatureResolution = curvatureResolutionAccessor(d);

        // update material
        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        obj.material.color.set(colorStr2Hex(color));
        obj.material.transparent = opacity < 1;
        obj.material.opacity = opacity;

        const h3Idxs = [];

        if (geoJson.type === 'Polygon') {
          h3Idxs.push(...polyfill(geoJson.coordinates, h3Res, true));
        } else if (geoJson.type === 'MultiPolygon') {
          geoJson.coordinates
            .forEach(coords => h3Idxs.push(...polyfill(coords, h3Res, true)));
        } else {
          console.warn(`Unsupported GeoJson geometry type: ${geoJson.type}. Skipping geometry...`);
        }

        const hexBins = h3Idxs.map(h3Idx => {
          const hexCenter = h3ToGeo(h3Idx);
          const hexGeoJson = h3ToGeoBoundary(h3Idx, true).reverse(); // correct polygon winding


          // stitch longitudes at the anti-meridian
          const centerLng = hexCenter[1];
          hexGeoJson.forEach(d => {
            const edgeLng = d[0];
            if (Math.abs(centerLng - edgeLng) > 170) {
              // normalize large lng distances
              d[0] += (centerLng > edgeLng ? 360 : -360);
            }
          });

          return { h3Idx, hexCenter, hexGeoJson };
        });

        const targetD = { alt, margin, curvatureResolution };

        const applyUpdate = td => {
          const { alt, margin, curvatureResolution } = obj.__currentTargetD = td;

          obj.geometry = new THREE.Geometry();

          hexBins.forEach(h => {
            // compute new geojson with relative margin
            const relNum = (st, end, rat) => st - (st - end) * rat;
            const [clat, clng] = h.hexCenter;
            const geoJson = margin === 0
              ? h.hexGeoJson
              : h.hexGeoJson.map(([elng, elat]) => [[elng, clng], [elat, clat]].map(([st, end]) => relNum(st, end, margin)));

            const hexGeom = new ConicPolygonGeometry([geoJson], GLOBE_RADIUS, GLOBE_RADIUS * (1 + alt), false, true, false, curvatureResolution);

            obj.geometry.merge(hexGeom);
          });
        };

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
