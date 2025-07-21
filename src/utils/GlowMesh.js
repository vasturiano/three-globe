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

const vertexShader = `
uniform float hollowRadius;

varying vec3 vVertexWorldPosition;
varying vec3 vVertexNormal;
varying float vCameraDistanceToObjCenter;
varying float vVertexAngularDistanceToHollowRadius;

void main() {
  vVertexNormal	= normalize(normalMatrix * normal);
  vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  
  vec4 objCenterViewPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vCameraDistanceToObjCenter = length(objCenterViewPosition);
  
  float edgeAngle = atan(hollowRadius / vCameraDistanceToObjCenter);
  float vertexAngle = acos(dot(normalize(modelViewMatrix * vec4(position, 1.0)), normalize(objCenterViewPosition)));
  vVertexAngularDistanceToHollowRadius = vertexAngle - edgeAngle;

  gl_Position	= projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform vec3 color;
uniform float coefficient;
uniform float power;
uniform float hollowRadius;
uniform float intensity;
uniform vec3 lightDirection;

varying vec3 vVertexNormal;
varying vec3 vVertexWorldPosition;
varying float vCameraDistanceToObjCenter;
varying float vVertexAngularDistanceToHollowRadius;

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
  if (vCameraDistanceToObjCenter < hollowRadius) discard; // inside the hollowRadius
  if (vVertexAngularDistanceToHollowRadius < 0.0) discard; // frag position is within the hollow radius

  vec3 worldCameraToVertex = vVertexWorldPosition - cameraPosition;
  vec3 viewCameraToVertex	= (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;
  viewCameraToVertex = normalize(viewCameraToVertex);
  float fresnel	= smoothstep(0.0, 1.0 - coefficient, pow(dot(vVertexNormal, viewCameraToVertex), power));
  float light = mix(1.0, clamp(dot(normalize(lightDirection), vVertexNormal), 0.05, 1.0), step(0.0000001, length(lightDirection)));
  gl_FragColor = clamp(intensity * vec4(color, fresnel * light), 0.0, 1.0);
}`;

// Based off: http://stemkoski.blogspot.fr/2013/07/shaders-in-threejs-glow-and-halo.html
function createGlowMaterial(intensity, coefficient, color, power, hollowRadius, lightDirection) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    transparent: true,
    vertexShader,
    fragmentShader,
    uniforms: {
      intensity: {
        value: intensity
      },
      coefficient: {
        value: coefficient,
      },
      color: {
        value: new THREE.Color(color),
      },
      power: {
        value: power,
      },
      hollowRadius: {
        value: hollowRadius,
      },
      lightDirection: {
        value: lightDirection,
      }
    },
  });
}

function createGlowGeometry(geometry, size) {
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

export default class GlowMesh extends THREE.Mesh {
  constructor(geometry, {
    color= 'gold',
    size= 2,
    intensity= 1,
    coefficient= 0.5,
    power= 1,
    hollowRadius= 0,
    lightDirection= [0,0,0],
    backside = true
  } = {}) {
    super();

    const glowGeometry = createGlowGeometry(geometry, size);
    const glowMaterial = createGlowMaterial(intensity, coefficient, color, power, hollowRadius, lightDirection);
    backside && (glowMaterial.side = THREE.BackSide);

    this.geometry = glowGeometry;
    this.material = glowMaterial;
  }
}