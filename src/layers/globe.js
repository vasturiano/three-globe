import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    AdditiveBlending,
    BackSide,
    Color,
    Mesh,
    MeshPhongMaterial,
    Object3D,
    ShaderMaterial,
    SphereGeometry,
    TextureLoader
  };

import Kapsule from 'kapsule';
import { geoGraticule10 } from 'd3-geo';

import drawThreeGeo from '../third-party/ThreeGeoJSON/threeGeoJSON';
import { emptyObject } from '../gc';
import { GLOBE_RADIUS } from '../constants';

//

export default Kapsule({
  props: {
    globeImageUrl: { onChange(_, state) { state.globeNeedsUpdate = true }},
    bumpImageUrl: { onChange(_, state) { state.globeNeedsUpdate = true }},
    showAtmosphere: { default: true, onChange(showAtmosphere, state) { state.atmosphereObj.visible = !!showAtmosphere }, triggerUpdate: false },
    showGraticules: { default: false, onChange(showGraticules, state) { state.graticulesObj.visible = !!showGraticules }, triggerUpdate: false},
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
      graticulesObj
    }
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.scene.add(state.globeObj); // add globe
    state.scene.add(state.atmosphereObj); // add atmosphere
    state.scene.add(state.graticulesObj); // add graticules
  },

  update(state) {
    const globeMaterial = state.globeObj.material;
    globeMaterial.needsUpdate = true;

    // Black globe if no image
    globeMaterial.color = !state.globeImageUrl ? new THREE.Color(0x000000) : null;

    globeMaterial.map = state.globeImageUrl ? new THREE.TextureLoader().load(state.globeImageUrl) : null;
    globeMaterial.bumpMap = state.bumpImageUrl ? new THREE.TextureLoader().load(state.bumpImageUrl) : null;
  }
});
