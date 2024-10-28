export const dashedLineShaders = () => ({
  uniforms: {
    // dash param defaults, all relative to full length
    dashOffset: { value: 0 },
    dashSize: { value: 1 },
    gapSize: { value: 0 },
    dashTranslate: { value: 0 } // used for animating the dash
  },
  vertexShader: `
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
    }
  `,
  fragmentShader: `
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