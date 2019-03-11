import {
  AdditiveBlending,
  BackSide,
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  UniformsUtils
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  AdditiveBlending,
  BackSide,
  Color,
  CylinderGeometry,
  FaceColors,
  Geometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  UniformsUtils
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

//

const GLOBE_RADIUS = 100;

const emptyObject = obj => {
  const materialDispose = material => {
    if (material instanceof Array) {
      material.forEach(materialDispose);
    } else {
      if (material.map) { material.map.dispose(); }
      material.dispose();
    }
  };
  const deallocate = obj => {
    if (obj.geometry) { obj.geometry.dispose(); }
    if (obj.material) { materialDispose(obj.material); }
    if (obj.texture) { obj.texture.dispose(); }
    if (obj.children) { obj.children.forEach(deallocate); }
  };

  while (obj.children.length) {
    const childObj = state.pointsG.children[0];
    state.pointsG.remove(childObj);
    deallocate(childObj);
  }
};

const Shaders = {
  earth : {
    uniforms: {
      'texture': { type: 't', value: null }
    },
    vertexShader: [
      'varying vec3 vNormal;',
      'varying vec2 vUv;',
      'void main() {',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      'vNormal = normalize( normalMatrix * normal );',
      'vUv = uv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D texture;',
      'varying vec3 vNormal;',
      'varying vec2 vUv;',
      'void main() {',
      'vec3 diffuse = texture2D( texture, vUv ).xyz;',
      'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
      'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
      'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
      '}'
    ].join('\n')
  },
  atmosphere : {
    uniforms: {},
    vertexShader: [
      'varying vec3 vNormal;',
      'void main() {',
      'vNormal = normalize( normalMatrix * normal );',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vNormal;',
      'void main() {',
      'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
      'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
      '}'
    ].join('\n')
  }
};

export default Kapsule({

  props: {
    globeImageUrl: { onChange(url) { this._loadGlobeImage(url)}, triggerUpdate: false},
    pointsData: { default: [], onChange(_, state) { state.pointsNeedsRepopulating = true }},
    pointLat: { default: 'lat', onChange(_, state) { state.pointsNeedsRepopulating = true } },
    pointLng: { default: 'lng', onChange(_, state) { state.pointsNeedsRepopulating = true } },
    pointColor: { default: () => '#ffffaa', onChange(_, state) { state.pointsNeedsRepopulating = true } },
    pointHeight: { default: 0.1, onChange(_, state) { state.pointsNeedsRepopulating = true } }, // in units of globe radius
    pointRadius: { default: 0.25, onChange(_, state) { state.pointsNeedsRepopulating = true } }, // in deg
    customLayerData: { default: [], onChange(_, state) { state.customLayerNeedsRepopulating = true }},
    customThreeObject: { default: [], onChange(_, state) { state.customLayerNeedsRepopulating = true }}
  },

  methods: {
    getCoords(state, lat, lng, relAltitude = 1) {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (180 - lng) * Math.PI / 180;
      const r = GLOBE_RADIUS * relAltitude;
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta)
      };
    },
    _loadGlobeImage: function(state, imageUrl) {
      if (state.globeObj && imageUrl) {
        const shader = Shaders.earth;
        const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms.texture.value = new THREE.TextureLoader().load(imageUrl);

        state.globeObj.material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader
        });
      }
      return this;
    }
  },

  stateInit: () => ({
    pointsNeedsRepopulating: true
  }),

  init(threeObj, state) {
    // Main three object to manipulate
    state.scene = threeObj;

    // Clear the scene
    emptyObject(state.scene);

    // add globe
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 40, 30);
    const globeObj = state.globeObj = new THREE.Mesh(globeGeometry, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    globeObj.rotation.y = Math.PI / 4; // face Greenwich Meridian
    globeObj.__globeObjType = 'globe'; // Add object type
    state.scene.add(globeObj);
    state.globeImageUrl && this._loadGlobeImage(state.globeImageUrl);

    // add atmosphere
    {
      const shader = Shaders['atmosphere'];
      const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });

      const mesh = new THREE.Mesh(globeGeometry, material);
      mesh.scale.set(1.1, 1.1, 1.1);
      mesh.__globeObjType = 'atmosphere'; // Add object type
      state.scene.add(mesh);
    }

    // add points group
    state.scene.add(state.pointsG = new THREE.Group());

    // add custom layer group
    state.scene.add(state.customLayerG = new THREE.Group());
  },

  update(state) {
    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;

    if (state.pointsNeedsRepopulating) {
      state.pointsNeedRepopulating = false;

      // Clear the existing points
      emptyObject(state.pointsG);

      // Data accessors
      const latAccessor = accessorFn(state.pointLat);
      const lngAccessor = accessorFn(state.pointLng);
      const heightAccessor = accessorFn(state.pointHeight);
      const radiusAccessor = accessorFn(state.pointRadius);
      const colorAccessor = accessorFn(state.pointColor);

      // Add WebGL points
      const pointGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
      pointGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      pointGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));
      const pointMaterials = {}; // indexed by color

      state.pointsData.forEach(pnt => {
        const color = colorAccessor(pnt);
        if (!pointMaterials.hasOwnProperty(color)) {
          pointMaterials[color] = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color)
          });
        }

        const obj = new THREE.Mesh(pointGeometry, pointMaterials[color]);

        // position cylinder ground
        Object.assign(obj.position, this.getCoords(latAccessor(pnt), lngAccessor(pnt)));

        // orientate outwards
        obj.lookAt(state.globeObj.position);

        // scale radius and altitude
        obj.scale.x = obj.scale.y = Math.min(30, radiusAccessor(pnt)) * pxPerDeg;
        obj.scale.z = Math.max(heightAccessor(pnt) * GLOBE_RADIUS, 0.1); // avoid non-invertible matrix

        obj.__globeObjType = 'point'; // Add object type
        obj.__data = pnt; // Attach point data

        state.pointsG.add(pnt.__threeObj = obj);
      });
    }

    if (state.customLayerNeedsRepopulating) {
      state.pointsNeedRepopulating = false;

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
        }

        obj.__globeObjType = 'custom'; // Add object type
        obj.__data = d; // Attach point data

        state.customLayerG.add(d.__threeObj = obj);
      });
    }
  }
});
