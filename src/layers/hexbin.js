import {
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshLambertMaterial,
  Object3D
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry,
    Color,
    DoubleSide,
    Mesh,
    MeshLambertMaterial,
    Object3D
  };

import * as _bfg from 'three/addons/utils/BufferGeometryUtils.js';
const bfg = Object.assign({}, _bfg);
const BufferGeometryUtils = bfg.BufferGeometryUtils || bfg;

import ConicPolygonGeometry from 'three-conic-polygon-geometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import indexBy from 'index-array-by';
import { latLngToCell, cellToLatLng, cellToBoundary } from 'h3-js';
import { Tween, Easing } from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha, color2ShaderArr } from '../utils/color-utils';
import { array2BufferAttr } from '../utils/three-utils';
import { applyShaderExtensionToMaterial, invisibleUndergroundShaderExtend } from '../utils/shaders';
import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    hexBinPointsData: { default: [] },
    hexBinPointLat: { default: 'lat' },
    hexBinPointLng: { default: 'lng' },
    hexBinPointWeight: { default: 1 },
    hexBinResolution: { default: 4 }, // 0-15. Level 0 partitions the earth in 122 (mostly) hexagonal cells. Each subsequent level sub-divides the previous in roughly 7 hexagons.
    hexMargin: { default: 0.2 }, // in fraction of diameter
    hexTopCurvatureResolution: { default: 5 }, // in angular degrees
    hexTopColor: { default: () => '#ffffaa' },
    hexSideColor: { default: () => '#ffffaa' },
    hexAltitude: { default: ({ sumWeight }) => sumWeight * 0.01 }, // in units of globe radius
    hexBinMerge: { default: false }, // boolean. Whether to merge all hex geometries into a single mesh for rendering performance
    hexTransitionDuration: { default: 1000, triggerUpdate: false } // ms
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
    const latAccessor = accessorFn(state.hexBinPointLat);
    const lngAccessor = accessorFn(state.hexBinPointLng);
    const weightAccessor = accessorFn(state.hexBinPointWeight);
    const altitudeAccessor = accessorFn(state.hexAltitude);
    const topColorAccessor = accessorFn(state.hexTopColor);
    const sideColorAccessor = accessorFn(state.hexSideColor);
    const marginAccessor = accessorFn(state.hexMargin);

    const byH3Idx = indexBy(state.hexBinPointsData.map(d => ({ ...d,
      h3Idx: latLngToCell(latAccessor(d), lngAccessor(d), state.hexBinResolution)
    })), 'h3Idx');

    const hexBins = Object.entries(byH3Idx).map(([h3Idx, points]) => ({
      h3Idx,
      points,
      sumWeight: points.reduce((agg, d) => agg + +weightAccessor(d), 0)
    }));

    const hexMaterials = {};  // indexed by color

    const scene = state.hexBinMerge ? new THREE.Object3D() : state.scene; // use fake scene if merging hex points

    threeDigest(hexBins, scene, {
      objBindAttr: '__threeObjHexbin',
      createObj,
      updateObj,
      idAccessor: d => d.h3Idx
    });

    if (state.hexBinMerge) { // merge points into a single mesh
      const hexPointsGeometry = !hexBins.length
        ? new THREE.BufferGeometry()
        : (BufferGeometryUtils.mergeGeometries || BufferGeometryUtils.mergeBufferGeometries)(hexBins.map(d => {
            const obj = d.__threeObj;
            d.__threeObj = undefined; // unbind merged points

            // use non-indexed geometry so that groups can be colored separately, otherwise different groups share vertices
            const geom = obj.geometry.toNonIndexed();

            // apply mesh world transform to vertices
            obj.updateMatrix();
            geom.applyMatrix4(obj.matrix);

            // color vertices
            const topColor = color2ShaderArr(topColorAccessor(d));
            const sideColor = color2ShaderArr(sideColorAccessor(d));

            const nVertices = geom.getAttribute('position').count;
            const topFaceIdx = geom.groups[0].count; // starting vertex index of top group
            geom.setAttribute('color', array2BufferAttr(
              [...new Array(nVertices)].map((_, idx) => idx >= topFaceIdx ? topColor : sideColor),
              4
            ));

            return geom;
          }));

      const hexMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        vertexColors: true,
        side: THREE.DoubleSide
      });
      hexMaterial.onBeforeCompile = shader => {
        hexMaterial.userData.shader = invisibleUndergroundShaderExtend(shader);
      };

      const hexPoints = new THREE.Mesh(hexPointsGeometry, hexMaterial);

      hexPoints.__globeObjType = 'hexBinPoints'; // Add object type
      hexPoints.__data = hexBins; // Attach obj data

      emptyObject(state.scene);
      state.scene.add(hexPoints);
    }

    //

    function createObj(d) {
      const obj = new THREE.Mesh();
      obj.__hexCenter = cellToLatLng(d.h3Idx);
      obj.__hexGeoJson = cellToBoundary(d.h3Idx, true).reverse(); // correct polygon winding

      // stitch longitudes at the anti-meridian
      const centerLng = obj.__hexCenter[1];
      obj.__hexGeoJson.forEach(d => {
        const edgeLng = d[0];
        if (Math.abs(centerLng - edgeLng) > 170) {
          // normalize large lng distances
          d[0] += (centerLng > edgeLng ? 360 : -360);
        }
      });

      obj.__globeObjType = 'hexbin'; // Add object type
      return obj;
    }

    function updateObj(obj, d) {
      // compute new geojson with relative margin
      const relNum = (st, end, rat) => st - (st - end) * rat;
      const margin = Math.max(0, Math.min(1, +marginAccessor(d)));
      const [clat, clng] = obj.__hexCenter;
      const geoJson = margin === 0
        ? obj.__hexGeoJson
        : obj.__hexGeoJson.map(([elng, elat]) => [[elng, clng], [elat, clat]].map(([st, end]) => relNum(st, end, margin)));

      const topCurvatureResolution = state.hexTopCurvatureResolution;

      obj.geometry && obj.geometry.dispose();
      obj.geometry = new ConicPolygonGeometry(
        [geoJson],
        0,
        GLOBE_RADIUS,
        false,
        true,
        true,
        topCurvatureResolution
      );

      const targetD = { alt: +altitudeAccessor(d) };

      const applyUpdate = td => {
        const { alt } = obj.__currentTargetD = td;
        obj.scale.x = obj.scale.y = obj.scale.z = 1 + alt; // scale according to altitude

        // update surfaceRadius per vertex
        const vertexSurfaceRadius = GLOBE_RADIUS / (alt + 1);
        obj.geometry.setAttribute('surfaceRadius', array2BufferAttr(
          Array(obj.geometry.getAttribute('position').count).fill(vertexSurfaceRadius),
          1
        ));
      };

      const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { alt: -1e-3 });

      if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
        if (state.hexBinMerge || !state.hexTransitionDuration || state.hexTransitionDuration < 0) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          state.tweenGroup.add(new Tween(currentTargetD)
            .to(targetD, state.hexTransitionDuration)
            .easing(Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start()
          );
        }
      }

      if (!state.hexBinMerge) {
        // Update materials on individual hex points
        const sideColor = sideColorAccessor(d);
        const topColor = topColorAccessor(d);

        [sideColor, topColor].forEach(color => {
          if (!hexMaterials.hasOwnProperty(color)) {
            const opacity = colorAlpha(color);
            hexMaterials[color] = applyShaderExtensionToMaterial(
              new THREE.MeshLambertMaterial({
                color: colorStr2Hex(color),
                transparent: opacity < 1,
                opacity: opacity,
                side: THREE.DoubleSide
              }),
              invisibleUndergroundShaderExtend
            );
          }
        });
        obj.material = [sideColor, topColor].map(color => hexMaterials[color]);
      }
    }
  }
});
