import {
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Mesh,
  MeshLambertMaterial,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry,
    CircleGeometry,
    DoubleSide,
    Mesh,
    MeshLambertMaterial,
    Vector3
  };

import * as _bfg from 'three/addons/utils/BufferGeometryUtils.js';
const bfg = Object.assign({}, _bfg);
const BufferGeometryUtils = bfg.BufferGeometryUtils || bfg;

import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { polygonToCells, cellToLatLng, cellToBoundary } from 'h3-js';
import { Tween, Easing } from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { polar2Cartesian, deg2Rad } from "../utils/coordTranslate";
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
    hexPolygonUseDots: { default: false }, // if points should be circular instead of hexagonal
    hexPolygonCurvatureResolution: { default: 5 }, // in angular degrees, only relevant for hex tops
    hexPolygonDotResolution: { default: 12 }, // how many slice segments in the dot circle's circumference
    hexPolygonsTransitionDuration: { default: 0, triggerUpdate: false } // ms
  },

  init(threeObj, state, { tweenGroup }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.tweenGroup = tweenGroup;
  },

  update(state) {
    // Accessors
    const geoJsonAccessor = accessorFn(state.hexPolygonGeoJsonGeometry);
    const colorAccessor = accessorFn(state.hexPolygonColor);
    const altitudeAccessor = accessorFn(state.hexPolygonAltitude);
    const resolutionAccessor = accessorFn(state.hexPolygonResolution);
    const marginAccessor = accessorFn(state.hexPolygonMargin);
    const useDotsAccessor = accessorFn(state.hexPolygonUseDots);
    const curvatureResolutionAccessor = accessorFn(state.hexPolygonCurvatureResolution);
    const dotResolutionAccessor = accessorFn(state.hexPolygonDotResolution);

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
        const useDots = useDotsAccessor(d);
        const curvatureResolution = curvatureResolutionAccessor(d);
        const dotResolution = dotResolutionAccessor(d);

        // update material
        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        obj.material.color.set(colorStr2Hex(color));
        obj.material.transparent = opacity < 1;
        obj.material.opacity = opacity;

        const targetD = { alt, margin, curvatureResolution };
        const memD = { geoJson, h3Res };
        const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { alt: -1e-3 });
        const currentMemD = obj.__currentMemD || memD;

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k]) || Object.keys(memD).some(k => currentMemD[k] !== memD[k])) {
          obj.__currentMemD = memD;

          const h3Idxs = [];

          if (geoJson.type === 'Polygon') {
            polygonToCells(geoJson.coordinates, h3Res, true).forEach(idx => h3Idxs.push(idx));
          } else if (geoJson.type === 'MultiPolygon') {
            geoJson.coordinates.forEach(coords =>
              polygonToCells(coords, h3Res, true).forEach(idx => h3Idxs.push(idx))
            );
          } else {
            console.warn(`Unsupported GeoJson geometry type: ${geoJson.type}. Skipping geometry...`);
          }


          const hexBins = h3Idxs.map(h3Idx => {
            const hexCenter = cellToLatLng(h3Idx);
            const hexGeoJson = cellToBoundary(h3Idx, true).reverse(); // correct polygon winding

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

          const applyUpdate = td => {
            const { alt, margin, curvatureResolution } = obj.__currentTargetD = td;

            obj.geometry && obj.geometry.dispose();
            obj.geometry = !hexBins.length
              ? new THREE.BufferGeometry()
              : (BufferGeometryUtils.mergeGeometries || BufferGeometryUtils.mergeBufferGeometries)(hexBins.map(h => {
                  const [clat, clng] = h.hexCenter;

                  if (useDots) {
                    const centerPos = polar2Cartesian(clat, clng, alt);
                    const edgePos = polar2Cartesian(h.hexGeoJson[0][1], h.hexGeoJson[0][0], alt);
                    const r = 0.85 * (1 - margin) *
                      new THREE.Vector3(centerPos.x, centerPos.y, centerPos.z)
                        .distanceTo(new THREE.Vector3(edgePos.x, edgePos.y, edgePos.z));

                    const geometry = new CircleGeometry(r, dotResolution);
                    geometry.rotateX(deg2Rad(-clat));
                    geometry.rotateY(deg2Rad(clng));
                    geometry.translate(centerPos.x, centerPos.y, centerPos.z);

                    return geometry;
                  } else {
                    const relNum = (st, end, rat) => st - (st - end) * rat;

                    // compute new geojson with relative margin
                    const geoJson = margin === 0
                      ? h.hexGeoJson
                      : h.hexGeoJson.map(([elng, elat]) => [[elng, clng], [elat, clat]].map(([st, end]) => relNum(st, end, margin)));

                    return new ConicPolygonGeometry(
                      [geoJson],
                      GLOBE_RADIUS,
                      GLOBE_RADIUS * (1 + alt),
                      false,
                      true,
                      false,
                      curvatureResolution
                    );
                  }
                })
              );
          };

          if (!state.hexPolygonsTransitionDuration || state.hexPolygonsTransitionDuration < 0) {
            // set final position
            applyUpdate(targetD);
          } else {
            // animate
            state.tweenGroup.add(new Tween(currentTargetD)
              .to(targetD, state.hexPolygonsTransitionDuration)
              .easing(Easing.Quadratic.InOut)
              .onUpdate(applyUpdate)
              .start()
            );
          }
        }
      }
    });
  }
});
