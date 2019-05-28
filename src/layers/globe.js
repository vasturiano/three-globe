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

import drawThreeGeo from '../utils/third-party/ThreeGeoJSON/threeGeoJSON';
import { emptyObject } from '../utils/gc';
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
        uniforms: {
          coeficient: { value: 0.8 },
          power: { value: 12 }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float	coeficient;
          uniform float	power;

          varying vec3 vNormal;
          void main() {
            float intensity = pow(coeficient - dot(vNormal, vec3(0, 0, 1.0)), power);
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * intensity;
          }
        `
      };
      const material = new THREE.ShaderMaterial({
        ...shaders,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
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

    // Black globe if no image
    globeMaterial.color = new THREE.Color(0x000000);

    state.globeImageUrl && new THREE.TextureLoader().load(state.globeImageUrl, texture => {
      globeMaterial.map = texture;
      globeMaterial.color = null;
      globeMaterial.needsUpdate = true;
    });

    state.bumpImageUrl && new THREE.TextureLoader().load(state.bumpImageUrl, texture => {
      globeMaterial.bumpMap = texture;
      globeMaterial.needsUpdate = true;
    });
  }
});
