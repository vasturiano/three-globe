import {
  BufferGeometry,
  Color,
  FaceColors,
  Geometry,
  Line,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BufferGeometry,
    Color,
    FaceColors,
    Geometry,
    Line,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    QuadraticBezierCurve3,
    TubeGeometry,
    Vector3
  };

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { geoDistance, geoInterpolate } from 'd3-geo';

import { colorStr2Hex, colorAlpha } from '../color-utils';
import { emptyObject } from '../gc';
import { polar2Cartesian } from '../coordTranslate';

//

export default Kapsule({
  props: {
    arcsData: { default: []},
    arcStartLat: { default: 'startLat'},
    arcStartLng: { default: 'startLng'},
    arcEndLat: { default: 'endLat'},
    arcEndLng: { default: 'endLng'},
    arcColor: { default: () => '#ffffaa'},
    arcAltitude: {}, // in units of globe radius
    arcAltitudeAutoScale: { default: 0.5}, // scale altitude proportional to great-arc distance between the two points
    arcStroke: {}, // in deg
    arcCurveResolution: { default: 64}, // how many slice segments in the tube's circumference
    arcCircularResolution: { default: 6}, // how many slice segments in the tube's circumference
    arcsMerge: { default: false} // boolean. Whether to merge all arcs into a single mesh for rendering performance
  },

  init(threeObj, state, { animateIn = true }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Clear the existing arcs
    emptyObject(state.scene);

    // Data accessors
    const startLatAccessor = accessorFn(state.arcStartLat);
    const startLngAccessor = accessorFn(state.arcStartLng);
    const endLatAccessor = accessorFn(state.arcEndLat);
    const endLngAccessor = accessorFn(state.arcEndLng);
    const altitudeAccessor = accessorFn(state.arcAltitude);
    const altitudeAutoScaleAccessor = accessorFn(state.arcAltitudeAutoScale);
    const strokeAccessor = accessorFn(state.arcStroke);
    const colorAccessor = accessorFn(state.arcColor);

    const arcObjs = [];

    state.arcsData.forEach(arc => {
      let curve;
      {
        const getVec = ([lng, lat, alt]) => {
          const { x, y, z } = polar2Cartesian(lat, lng, alt);
          return new THREE.Vector3(x, y, z);
        };

        //calculate curve
        const startPnt = [startLngAccessor, startLatAccessor].map(fn => fn(arc));
        const endPnt = [endLngAccessor, endLatAccessor].map(fn => fn(arc));

        let altitude = altitudeAccessor(arc);
        (altitude === null || altitude === undefined) &&
          // by default set altitude proportional to the great-arc distance
          (altitude = geoDistance(startPnt, endPnt) / 2 * altitudeAutoScaleAccessor(arc));

        const interpolate = geoInterpolate(startPnt, endPnt);
        const [m1Pnt, m2Pnt] = [0.25, 0.75].map(t => [...interpolate(t), altitude * 1.5]);
        curve = new THREE.CubicBezierCurve3(...[startPnt, m1Pnt, m2Pnt, endPnt].map(getVec));

        //const mPnt = [...interpolate(0.5), altitude * 2];
        //curve = new THREE.QuadraticBezierCurve3(...[startPnt, mPnt, endPnt].map(getVec));
      }

      const stroke = strokeAccessor(arc);

      const obj = (stroke === null || stroke === undefined)
        ? new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(state.arcCurveResolution))
        )
        : new THREE.Mesh(
          new THREE.TubeGeometry(curve, state.arcCurveResolution, stroke / 2, state.arcCircularResolution)
        );

      obj.__globeObjType = 'arc'; // Add object type
      obj.__data = arc; // Attach point data

      arcObjs.push(obj);
    });

    if (state.arcsMerge) { // merge arcs into a single mesh
      const arcsGeometry = new THREE.Geometry();

      arcObjs.forEach(obj => {
        const arc = obj.__data;

        const color = new THREE.Color(colorAccessor(arc));
        obj.geometry.faces.forEach(face => face.color = color);

        obj.updateMatrix();

        arcsGeometry.merge(obj.geometry, obj.matrix);
      });

      const arcs = new THREE.Mesh(arcsGeometry, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.FaceColors,
        morphTargets: false
      }));

      arcs.__globeObjType = 'arcs'; // Add object type
      arcs.__data = state.arcsData; // Attach obj data

      state.scene.add(arcs);

    } else { // Add individual meshes per arc

      const arcMaterials = {}; // indexed by color

      arcObjs.forEach(obj => {
        const arc = obj.__data;
        const color = colorAccessor(arc);
        const opacity = colorAlpha(color);
        if (!arcMaterials.hasOwnProperty(color)) {
          arcMaterials[color] = new THREE.MeshLambertMaterial({
            color: colorStr2Hex(color),
            transparent: opacity < 1,
            opacity: opacity
          });
        }

        obj.material = arcMaterials[color];

        state.scene.add(arc.__threeObj = obj);
      });
    }
  }
});
