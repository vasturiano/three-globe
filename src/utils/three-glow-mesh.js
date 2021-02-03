import {
  BackSide,
  BufferAttribute,
  Color,
  Mesh,
  ShaderMaterial
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    BackSide,
    BufferAttribute,
    Color,
    Mesh,
    ShaderMaterial
  };

const fragmentShader = `
uniform vec3 color;
uniform float coefficient;
uniform float power;
varying vec3 vVertexNormal;
varying vec3 vVertexWorldPosition;
void main() {
  vec3 worldCameraToVertex = vVertexWorldPosition - cameraPosition;
  vec3 viewCameraToVertex	= (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;
  viewCameraToVertex = normalize(viewCameraToVertex);
  float intensity	= pow(
    coefficient + dot(vVertexNormal, viewCameraToVertex),
    power
  );
  gl_FragColor = vec4(color, intensity);
}`;

const vertexShader = `
varying vec3 vVertexWorldPosition;
varying vec3 vVertexNormal;
void main() {
  vVertexNormal	= normalize(normalMatrix * normal);
  vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position	= projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const defaultOptions = {
  backside: true,
  coefficient: 0.5,
  color: 'gold',
  size: 2,
  power: 1,
};

// Based off: http://stemkoski.blogspot.fr/2013/07/shaders-in-threejs-glow-and-halo.html
export function createGlowMaterial(coefficient, color, power) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    fragmentShader,
    transparent: true,
    uniforms: {
      coefficient: {
        value: coefficient,
      },
      color: {
        value: new THREE.Color(color),
      },
      power: {
        value: power,
      },
    },
    vertexShader,
  });
}

export function createGlowGeometry(geometry, size) {
  // expect BufferGeometry
  const glowGeometry = geometry.clone();

  // Resize vertex positions according to normals
  const position = new Float32Array(geometry.attributes.position.count * 3);
  for (let idx=0, len=position.length; idx<len; idx++) {
    const normal = geometry.attributes.normal.array[idx];
    const curPos = geometry.attributes.position.array[idx];
    position[idx] = curPos + normal * size;
  }
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(position, 3));

  return glowGeometry;
}

export function createGlowMesh(geometry, options = defaultOptions) {
  const { backside, coefficient, color, size, power } = options;

  const glowGeometry = createGlowGeometry(geometry, size);
  const glowMaterial = createGlowMaterial(coefficient, color, power);

  if (backside) {
    glowMaterial.side = THREE.BackSide;
  }

  return new THREE.Mesh(glowGeometry, glowMaterial);
}