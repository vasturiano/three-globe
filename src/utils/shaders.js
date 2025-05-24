import { ShaderChunk } from "three";

export const dashedLineShaders = () => ({
  uniforms: {
    // dash param defaults, all relative to full length
    dashOffset: { value: 0 },
    dashSize: { value: 1 },
    gapSize: { value: 0 },
    dashTranslate: { value: 0 } // used for animating the dash
  },
  vertexShader: `
    ${ShaderChunk.common}
    ${ShaderChunk.logdepthbuf_pars_vertex}
    uniform float dashTranslate; 

    attribute vec4 color;
    varying vec4 vColor;
    
    attribute float relDistance;
    varying float vRelDistance;

    void main() {
      // pass through colors and distances
      vColor = color;
      vRelDistance = relDistance + dashTranslate;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      ${ShaderChunk.logdepthbuf_vertex}
    }
  `,
  fragmentShader: `
    ${ShaderChunk.logdepthbuf_fragment}
    uniform float dashOffset; 
    uniform float dashSize;
    uniform float gapSize; 
    
    varying vec4 vColor;
    varying float vRelDistance;
    
    void main() {
      // ignore pixels in the gap
      if (vRelDistance < dashOffset) discard;
      if (mod(vRelDistance - dashOffset, dashSize + gapSize) > dashSize) discard;
    
      // set px color: [r, g, b, a], interpolated between vertices 
      gl_FragColor = vColor; 
      ${ShaderChunk.logdepthbuf_fragment}
    }
  `
});

export const invisibleUndergroundShader = ({ vertexColors = false } = {}) => ({
  uniforms: {
    color: { type: 'vec4' },
    surfaceRadius: { type: 'float', value: 0 },
  },
  vertexShader: `
    attribute vec4 color;
    attribute float surfaceRadius;
    
    varying vec3 vPos;
    varying vec4 vColor;
    varying float vSurfaceRadius;

    void main() {
      // pass through position, color & surfaceRadius
      vPos = position;
      vColor = color;
      vSurfaceRadius = surfaceRadius;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec4 color; 
    uniform float surfaceRadius;
    
    varying vec3 vPos;
    varying vec4 vColor;
    varying float vSurfaceRadius;
    
    void main() {
      // ignore pixels underground
      if (length(vPos) < max(surfaceRadius, vSurfaceRadius)) discard;
      
      gl_FragColor = ${vertexColors ? 'vColor' : 'color'};
    }
  `
});

export const invisibleUndergroundShaderExtend = shader => {
  shader.uniforms.surfaceRadius = { type: 'float', value: 0 };
  shader.vertexShader = ('attribute float surfaceRadius;\nvarying float vSurfaceRadius;\nvarying vec3 vPos;\n' + shader.vertexShader)
    .replace('void main() {', [
      'void main() {',
      'vSurfaceRadius = surfaceRadius;',
      'vPos = position;'
    ].join('\n'));

  shader.fragmentShader = ('uniform float surfaceRadius;\nvarying float vSurfaceRadius;\nvarying vec3 vPos;\n' + shader.fragmentShader)
    .replace('void main() {', [
      'void main() {',
      'if (length(vPos) < max(surfaceRadius, vSurfaceRadius)) discard;'
    ].join('\n'));

  return shader;
};

export const setRadiusShaderExtend = shader => {
  shader.vertexShader = `
    attribute float r;
    
    const float PI = 3.1415926535897932384626433832795;
    float toRad(in float a) {
      return a * PI / 180.0;
    }
    
    vec3 Polar2Cartesian(in vec3 c) { // [lat, lng, r]
      float phi = toRad(90.0 - c.x);
      float theta = toRad(90.0 - c.y);
      float r = c.z;
      return vec3( // x,y,z
        r * sin(phi) * cos(theta),
        r * cos(phi),
        r * sin(phi) * sin(theta)
      );
    }
    
    vec2 Cartesian2Polar(in vec3 p) {
      float r = sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      float phi = acos(p.y / r);
      float theta = atan(p.z, p.x);
      return vec2( // lat,lng
        90.0 - phi * 180.0 / PI,
        90.0 - theta * 180.0 / PI - (theta < -PI / 2.0 ? 360.0 : 0.0)
      );
    }
    ${shader.vertexShader.replace('}', `                  
        vec3 pos = Polar2Cartesian(vec3(Cartesian2Polar(position), r));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `)}
  `;

  return shader;
}

//

export const applyShaderExtensionToMaterial = (material, extensionFn) => {
  material.onBeforeCompile = shader => {
    material.userData.shader = extensionFn(shader);
  };
  return material;
};

export const setExtendedMaterialUniforms = (material, uniformsFn = u => u) => {
  if (material.userData.shader) {
    uniformsFn(material.userData.shader.uniforms);
  } else {
    const curFn = material.onBeforeCompile;
    material.onBeforeCompile = shader => {
      curFn(shader);
      uniformsFn(shader.uniforms);
    };
  }
}