import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Group,
  Line,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
  QuadraticBezierCurve3,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  TubeGeometry,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Group,
  Line,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
  QuadraticBezierCurve3,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  TubeGeometry,
  Vector3
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { geoDistance, geoInterpolate, geoGraticule10 } from 'd3-geo';

import drawThreeGeo from './third-party/ThreeGeoJSON/threeGeoJSON';
import { colorStr2Hex, colorAlpha } from './color-utils';
import { emptyObject } from './gc';

//

const GLOBE_RADIUS = 100;

export default Kapsule({
  props: {
    globeImageUrl: { onChange(_, state) { state.globeNeedsUpdate = true }},
    bumpImageUrl: { onChange(_, state) { state.globeNeedsUpdate = true }},
    showAtmosphere: { default: true, onChange(showAtmosphere, state) { state.atmosphereObj.visible = !!showAtmosphere }, triggerUpdate: false },
    showGraticules: { default: false, onChange(showGraticules, state) { state.graticulesObj.visible = !!showGraticules }, triggerUpdate: false},
    pointsData: { default: [], onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointLat: { default: 'lat', onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointLng: { default: 'lng', onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointColor: { default: () => '#ffffaa', onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointAltitude: { default: 0.1, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // in units of globe radius
    pointRadius: { default: 0.25, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // in deg
    pointResolution: { default: 12, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // how many slice segments in the cylinder's circumference
    pointsMerge: { default: false, onChange(_, state) { state.pointsNeedsRepopulating = true }}, // boolean. Whether to merge all points into a single mesh for rendering performance
    arcsData: { default: [], onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcStartLat: { default: 'startLat', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcStartLng: { default: 'startLng', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcEndLat: { default: 'endLat', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcEndLng: { default: 'endLng', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcColor: { default: () => '#ffffaa', onChange(_, state) { state.arcsNeedsRepopulating = true }},
    arcAltitude: { onChange(_, state) { state.arcsNeedsRepopulating = true }}, // in units of globe radius
    arcAltitudeAutoScale: { default: 0.5, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // scale altitude proportional to great-arc distance between the two points
    arcStroke: { onChange(_, state) { state.arcsNeedsRepopulating = true }}, // in deg
    arcCurveResolution: { default: 64, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // how many slice segments in the tube's circumference
    arcCircularResolution: { default: 6, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // how many slice segments in the tube's circumference
    arcsMerge: { default: false, onChange(_, state) { state.arcsNeedsRepopulating = true }}, // boolean. Whether to merge all arcs into a single mesh for rendering performance
    customLayerData: { default: [], onChange(_, state) { state.customLayerNeedsRepopulating = true }},
    customThreeObject: { onChange(_, state) { state.customLayerNeedsRepopulating = true }}
  },

  methods: {
    getCoords(state, lat, lng, relAltitude = 0) {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (90 - lng) * Math.PI / 180;
      const r = GLOBE_RADIUS * (1 + relAltitude);
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta)
      };
    }
  },

  stateInit: () => {
    // create globe
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 75, 75);
    const globeObj = new THREE.Mesh(globeGeometry, new THREE.MeshPhongMaterial({ color: 0x000000 }));
    globeObj.rotation.y = -Math.PI / 2; // face prime meridian along Z axis
    globeObj.__globeObjType = 'globe'; // Add object type

    // create atmosphere
    let atmosphereObj;
    {
      const shaders = {
        vertex: [
          'varying vec3 vNormal;',
          'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          '}'
        ].join('\n'),
        fragment: [
          'varying vec3 vNormal;',
          'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
          '}'
        ].join('\n')
      };
      const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: shaders.vertex,
        fragmentShader: shaders.fragment,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });

      atmosphereObj = new THREE.Mesh(globeGeometry, material);
      atmosphereObj.scale.set(1.1, 1.1, 1.1);
      atmosphereObj.__globeObjType = 'atmosphere'; // Add object type
    }

    // create graticules
    let graticulesObj;
    {
      // add graticules
      graticulesObj = new THREE.Object3D();
      drawThreeGeo(
        { geometry: geoGraticule10(), type: 'Feature' },
        GLOBE_RADIUS,
        'sphere',
        { color: 'lightgrey', transparent: true, opacity: 0.1 },
        graticulesObj
      );
      graticulesObj.rotation.x = Math.PI / 2; // Align poles with Y axis
    }

    return {
      globeObj,
      atmosphereObj,
      graticulesObj,
      globeNeedsUpdate: true,
      pointsNeedsRepopulating: true,
      arcsNeedsRepopulating: true,
      customLayerNeedsRepopulating: true
    }
  },

  init(threeObj, state) {
    // Main three object to manipulate
    state.scene = threeObj;

    // Clear the scene
    emptyObject(state.scene);

    state.scene.add(state.globeObj); // add globe
    state.scene.add(state.atmosphereObj); // add atmosphere
    state.scene.add(state.graticulesObj); // add graticules

    state.scene.add(state.pointsG = new THREE.Group()); // add points group
    state.scene.add(state.arcsG = new THREE.Group()); // add arcs group
    state.scene.add(state.customLayerG = new THREE.Group()); // add custom layer group
  },

  update(state) {
    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;

    if (state.globeNeedsUpdate) {
      state.globeNeedsUpdate = false;

      const globeMaterial = state.globeObj.material;
      globeMaterial.needsUpdate = true;

      // Black globe if no image
      globeMaterial.color = !state.globeImageUrl ? new THREE.Color(0x000000) : null;

      globeMaterial.map = state.globeImageUrl ? new THREE.TextureLoader().load(state.globeImageUrl) : null;
      globeMaterial.bumpMap = state.bumpImageUrl ? new THREE.TextureLoader().load(state.bumpImageUrl) : null;
    }

    if (state.pointsNeedsRepopulating) {
      state.pointsNeedsRepopulating = false;

      // Clear the existing points
      emptyObject(state.pointsG);

      // Data accessors
      const latAccessor = accessorFn(state.pointLat);
      const lngAccessor = accessorFn(state.pointLng);
      const altitudeAccessor = accessorFn(state.pointAltitude);
      const radiusAccessor = accessorFn(state.pointRadius);
      const colorAccessor = accessorFn(state.pointColor);

      // Add WebGL points
      const pointGeometry = new THREE.CylinderGeometry(1, 1, 1, state.pointResolution);
      pointGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      pointGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

      const pointObjs = [];

      state.pointsData.forEach(pnt => {
        const obj = new THREE.Mesh(pointGeometry);

        // position cylinder ground
        Object.assign(obj.position, this.getCoords(latAccessor(pnt), lngAccessor(pnt)));

        // orientate outwards
        obj.lookAt(state.globeObj.position);

        // scale radius and altitude
        obj.scale.x = obj.scale.y = Math.min(30, radiusAccessor(pnt)) * pxPerDeg;
        obj.scale.z = Math.max(altitudeAccessor(pnt) * GLOBE_RADIUS, 0.1); // avoid non-invertible matrix

        obj.__globeObjType = 'point'; // Add object type
        obj.__data = pnt; // Attach point data

        pointObjs.push(obj);
      });

      if (state.pointsMerge) { // merge points into a single mesh
        const pointsGeometry = new THREE.Geometry();

        pointObjs.forEach(obj => {
          const pnt = obj.__data;

          const color = new THREE.Color(colorAccessor(pnt));
          obj.geometry.faces.forEach(face => face.color = color);

          obj.updateMatrix();

          pointsGeometry.merge(obj.geometry, obj.matrix);
        });

        const points = new THREE.Mesh(pointsGeometry, new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: THREE.FaceColors,
          morphTargets: false
        }));

        points.__globeObjType = 'points'; // Add object type
        points.__data = state.pointsData; // Attach obj data

        state.pointsG.add(points);

      } else { // Add individual meshes per point

        const pointMaterials = {}; // indexed by color

        pointObjs.forEach(obj => {
          const pnt = obj.__data;
          const color = colorAccessor(pnt);
          const opacity = colorAlpha(color);
          if (!pointMaterials.hasOwnProperty(color)) {
            pointMaterials[color] = new THREE.MeshLambertMaterial({
              color: colorStr2Hex(color),
              transparent: opacity < 1,
              opacity: opacity
            });
          }

          obj.material = pointMaterials[color];

          state.pointsG.add(pnt.__threeObj = obj);
        });
      }
    }

    if (state.arcsNeedsRepopulating) {
      state.arcsNeedsRepopulating = false;

      // Clear the existing arcs
      emptyObject(state.arcsG);

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
            const { x, y, z } = this.getCoords(lat, lng, alt);
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

        state.arcsG.add(arcs);

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

          state.arcsG.add(arc.__threeObj = obj);
        });
      }
    }

    if (state.customLayerNeedsRepopulating) {
      state.customLayerNeedsRepopulating = false;

      // Clear the existing objects
      emptyObject(state.customLayerG);

      const customObjectAccessor = accessorFn(state.customThreeObject);

      state.customLayerData.forEach(d => {
        let obj = customObjectAccessor(d, GLOBE_RADIUS);

        if (obj) {
          if (state.customThreeObject === obj) {
            // clone object if it's a shared object among all points
            obj = obj.clone();
          }

          obj.__globeObjType = 'custom'; // Add object type
          obj.__data = d; // Attach point data

          state.customLayerG.add(d.__threeObj = obj);
        }
      });
    }
  }
});
