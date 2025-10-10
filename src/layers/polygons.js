import {
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial
};

import ConicPolygonGeometry from 'three-conic-polygon-geometry';
import GeoJsonGeometry from 'three-geojson-geometry';

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { Tween, Easing } from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { invisibleUndergroundShaderExtend, applyShaderExtensionToMaterial, setExtendedMaterialUniforms } from '../utils/shaders';
import { emptyObject } from '../utils/gc';
import ThreeDigest from '../utils/digest';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    polygonsData: { default: [] },
    polygonGeoJsonGeometry: { default: 'geometry' },
    polygonSideColor: { default: () => '#ffffaa' },
    polygonSideMaterial: {},
    polygonCapColor: { default: () => '#ffffaa' },
    polygonCapMaterial: {},
    polygonStrokeColor: {},
    polygonAltitude: { default: 0.01 }, // in units of globe radius
    polygonCapCurvatureResolution: { default: 5 }, // in angular degrees
    polygonsTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state, { tweenGroup }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.tweenGroup = tweenGroup;

    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjPolygon' })
      .id(d => d.id)
      .onCreateObj(() => {
        const obj = new THREE.Group();

        obj.__defaultSideMaterial = applyShaderExtensionToMaterial(
          new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, depthWrite: true }),
          invisibleUndergroundShaderExtend
        );

        obj.__defaultCapMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, depthWrite: true });

        // conic geometry
        obj.add(new THREE.Mesh(
          undefined,
          [
            obj.__defaultSideMaterial, // side material
            obj.__defaultCapMaterial // cap material
          ]
        ));

        // polygon stroke
        obj.add(new THREE.LineSegments(
          undefined,
          new THREE.LineBasicMaterial()
        ));

        obj.__globeObjType = 'polygon'; // Add object type

        return obj;
      });
  },

  update(state) {
    // Data accessors
    const geoJsonAccessor = accessorFn(state.polygonGeoJsonGeometry);
    const altitudeAccessor = accessorFn(state.polygonAltitude);
    const capCurvatureResolutionAccessor = accessorFn(state.polygonCapCurvatureResolution);
    const capColorAccessor = accessorFn(state.polygonCapColor);
    const capMaterialAccessor = accessorFn(state.polygonCapMaterial);
    const sideColorAccessor = accessorFn(state.polygonSideColor);
    const sideMaterialAccessor = accessorFn(state.polygonSideMaterial);
    const strokeColorAccessor = accessorFn(state.polygonStrokeColor);

    const singlePolygons = [];
    state.polygonsData.forEach(polygon => {
      const objAttrs = {
        data: polygon,
        capColor: capColorAccessor(polygon),
        capMaterial: capMaterialAccessor(polygon),
        sideColor: sideColorAccessor(polygon),
        sideMaterial: sideMaterialAccessor(polygon),
        strokeColor: strokeColorAccessor(polygon),
        altitude: +altitudeAccessor(polygon),
        capCurvatureResolution: +capCurvatureResolutionAccessor(polygon)
      };

      const geoJson = geoJsonAccessor(polygon);
      const geoId = polygon.__id || `${Math.round(Math.random() * 1e9)}`; // generate and stamp polygon ids to keep track in digest
      polygon.__id = geoId;

      if (geoJson.type === 'Polygon') {
        singlePolygons.push({
          id: `${geoId}_0`,
          coords: geoJson.coordinates,
          ...objAttrs
        });
      } else if (geoJson.type === 'MultiPolygon') {
        singlePolygons.push(...geoJson.coordinates.map((coords, idx) => ({
          id: `${geoId}_${idx}`,
          coords,
          ...objAttrs
        })));
      } else {
        console.warn(`Unsupported GeoJson geometry type: ${geoJson.type}. Skipping geometry...`);
      }
    });

    state.dataMapper
      .onUpdateObj((obj, { coords, capColor, capMaterial, sideColor, sideMaterial, strokeColor, altitude, capCurvatureResolution }) => {
        const [conicObj, strokeObj] = obj.children;

        // hide stroke if no color set
        const addStroke = !!strokeColor;
        strokeObj.visible = addStroke;

        const hasCap = !!(capColor || capMaterial);
        const hasSide = !!(sideColor || sideMaterial);

        // regenerate geometries if needed
        if(!objMatch(conicObj.geometry.parameters || {}, {
          polygonGeoJson: coords,
          curvatureResolution: capCurvatureResolution,
          closedTop: hasCap,
          includeSides: hasSide,
        })) {
          conicObj.geometry && conicObj.geometry.dispose();
          conicObj.geometry = new ConicPolygonGeometry(
            coords,
            0,
            GLOBE_RADIUS,
            false,
            hasCap,
            hasSide,
            capCurvatureResolution
          );
        }

        if (addStroke && (!strokeObj.geometry.parameters || strokeObj.geometry.parameters.geoJson.coordinates !== coords || strokeObj.geometry.parameters.resolution !== capCurvatureResolution)) {
          strokeObj.geometry && strokeObj.geometry.dispose();
          strokeObj.geometry = new GeoJsonGeometry(
            {type: 'Polygon', coordinates: coords},
            GLOBE_RADIUS,
            capCurvatureResolution
          );
        }

        const sideIdx = hasSide ? 0 : -1;
        const capIdx = !hasCap ? -1 : hasSide ? 1 : 0;

        // replace side/cap materials if defined
        sideIdx >= 0 && (conicObj.material[sideIdx] = sideMaterial || obj.__defaultSideMaterial);
        capIdx >= 0 && (conicObj.material[capIdx] = capMaterial || obj.__defaultCapMaterial);

        // update default material colors
        [[!sideMaterial && sideColor, sideIdx], [!capMaterial && capColor, capIdx]].forEach(([color, materialIdx]) => {
          if (!color || materialIdx < 0) return; // skip custom or hidden materials

          // conic object
          const material = conicObj.material[materialIdx];
          const opacity = colorAlpha(color);
          material.color.set(colorStr2Hex(color));
          material.transparent = opacity < 1;
          material.opacity = opacity;
        });

        if (addStroke) {
          // stroke object
          const material = strokeObj.material;
          const opacity = colorAlpha(strokeColor);
          material.color.set(colorStr2Hex(strokeColor));
          material.transparent = opacity < 1;
          material.opacity = opacity;
        }

        const targetD = { alt: altitude };

        const applyUpdate = td => {
          const { alt } = obj.__currentTargetD = td;
          conicObj.scale.x = conicObj.scale.y = conicObj.scale.z = 1 + alt;
          addStroke && (strokeObj.scale.x = strokeObj.scale.y = strokeObj.scale.z = 1 + alt + 1e-4); // stroke slightly above the conic mesh
          setExtendedMaterialUniforms(obj.__defaultSideMaterial, uniforms => (uniforms.uSurfaceRadius.value = GLOBE_RADIUS / (alt + 1))); // update side material scale uniform
        };

        const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { alt: -1e-3 });

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
          if (!state.polygonsTransitionDuration || state.polygonsTransitionDuration < 0 || currentTargetD.alt === targetD.alt) {
            // set final position
            applyUpdate(targetD);
          } else {
            // animate
            state.tweenGroup.add(new Tween(currentTargetD)
              .to(targetD, state.polygonsTransitionDuration)
              .easing(Easing.Quadratic.InOut)
              .onUpdate(applyUpdate)
              .start()
            );
          }
        }
      })
      .digest(singlePolygons);
  }
});

function objMatch(obj, attrs, compFn = () => (a, b) => a === b) {
  return Object.entries(attrs).every(([k, v]) => obj.hasOwnProperty(k) && compFn(k)(obj[k], v));
}
