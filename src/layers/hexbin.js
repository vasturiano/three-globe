import {
  Color,
  DoubleSide,
  FaceColors,
  Geometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    Color,
    DoubleSide,
    FaceColors,
    Geometry,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D
  };

import { ConicPolygonGeometry } from 'three-conic-polygon-geometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import indexBy from 'index-array-by';
import { geoToH3, h3ToGeo, h3ToGeoBoundary } from 'h3-js';
import TWEEN from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { emptyObject } from '../utils/gc';
import threeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate';
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

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
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
      h3Idx: geoToH3(latAccessor(d), lngAccessor(d), state.hexBinResolution)
    })), 'h3Idx');

    const hexBins = Object.entries(byH3Idx).map(([h3Idx, points]) => ({
      h3Idx,
      points,
      sumWeight: points.reduce((agg, d) => agg + +weightAccessor(d), 0)
    }));

    const hexMaterials = {}; // indexed by color

    const scene = state.hexBinMerge ? new THREE.Object3D() : state.scene; // use fake scene if merging hex points

    threeDigest(hexBins, scene, {
      createObj,
      updateObj,
      idAccessor: d => d.h3Idx
    });

    if (state.hexBinMerge) { // merge points into a single mesh
      const hexPointsGeometry = new THREE.Geometry();

      hexBins.forEach(d => {
        const obj = d.__threeObj;
        d.__threeObj = undefined; // unbind merged points

        // color faces
        const topColor = new THREE.Color(topColorAccessor(d));
        const sideColor = new THREE.Color(sideColorAccessor(d));
        const topFaceIdx = obj.geometry.faces.length - 4;
        obj.geometry.faces.forEach((face, idx) => face.color = idx >= topFaceIdx ? topColor : sideColor);

        obj.updateMatrix();

        hexPointsGeometry.merge(obj.geometry, obj.matrix);
      });

      const hexPoints = new THREE.Mesh(hexPointsGeometry, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.FaceColors,
        morphTargets: false,
        side: THREE.DoubleSide
      }));

      hexPoints.__globeObjType = 'hexBinPoints'; // Add object type
      hexPoints.__data = hexBins; // Attach obj data

      emptyObject(state.scene);
      state.scene.add(hexPoints);
    }

    //

    function createObj(d) {
      const obj = new THREE.Mesh();
      obj.__hexCenter = h3ToGeo(d.h3Idx);
      obj.__hexGeoJson = h3ToGeoBoundary(d.h3Idx, true).reverse(); // correct polygon winding

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
      const GeometryClass = state.hexBinMerge ? ConicPolygonGeometry : ConicPolygonGeometry;

      const targetD = {
        alt: +altitudeAccessor(d),
        margin: Math.max(0, Math.min(1, +marginAccessor(d))),
        hexTopCurvatureResolution: state.hexTopCurvatureResolution
      };

      const applyUpdate = td => {
        const { alt, margin, hexTopCurvatureResolution } = obj.__currentTargetD = td;

        // const final = Math.abs(alt - targetD.alt) < 1e-9 && Math.abs(margin - targetD.margin) < 1e-9;
        // const topRes = final ? hexTopCurvatureResolution : 180; // use lower resolution for transitory states
        const topRes = hexTopCurvatureResolution;

        // compute new geojson with relative margin
        const relNum = (st, end, rat) => st - (st - end) * rat;
        const [clat, clng] = obj.__hexCenter;
        const geoJson = margin === 0
          ? obj.__hexGeoJson
          : obj.__hexGeoJson.map(([elng, elat]) => [[elng, clng], [elat, clat]].map(([st, end]) => relNum(st, end, margin)));

        obj.geometry = new GeometryClass([geoJson], GLOBE_RADIUS, GLOBE_RADIUS * (1 + alt), false, true, true, topRes);
      };

      const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { alt: -1e-3 });

      if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
        if (state.hexBinMerge || !state.hexTransitionDuration || state.hexTransitionDuration < 0) {
          // set final position
          applyUpdate(targetD);
        } else {
          // animate
          new TWEEN.Tween(currentTargetD)
            .to(targetD, state.hexTransitionDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(applyUpdate)
            .start();
        }
      }

      if (!state.hexBinMerge) {
        // Update materials on individual hex points
        const sideColor = sideColorAccessor(d);
        const topColor = topColorAccessor(d);

        [sideColor, topColor].forEach(color => {
          if (!hexMaterials.hasOwnProperty(color)) {
            const opacity = colorAlpha(color);
            hexMaterials[color] = new THREE.MeshLambertMaterial({
              color: colorStr2Hex(color),
              transparent: opacity < 1,
              opacity: opacity,
              side: THREE.DoubleSide
            });
          }
        });

        obj.material = [sideColor, topColor].map(color => hexMaterials[color]);
      }
    }
  }
});
