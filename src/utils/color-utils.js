import { Color } from 'three';
import { color as d3Color } from 'd3-color';
import tinyColor from 'tinycolor2';

const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
const colorAlpha = str => str && isNaN(str) ? d3Color(str).opacity : 1;

const color2ShaderArr = (str, includeAlpha = true, sRGBColorSpace = false) => {
  let color;
  let alpha = 1;
  const rgbaMatch = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.eE+-]+)\s*\)$/.exec(str.trim().toLowerCase());
  if (rgbaMatch) {
    const [r,g,b,a] = rgbaMatch.slice(1);
    color = new Color(`rgb(${+r},${+g},${+b})`);
    alpha = Math.min(+a, 1);
  } else {
    color = new Color(str);
  }

  sRGBColorSpace && color.convertLinearToSRGB(); // vertexColors expects linear, but shaders expect sRGB

  const rgbArr = color.toArray();
  return includeAlpha ? [...rgbArr, alpha] : rgbArr;
};

function setMaterialOpacity(material, opacity, depthWrite) {
  material.opacity = opacity;
  material.transparent = opacity < 1;
  material.depthWrite = depthWrite === undefined ? opacity >= 1 : depthWrite; // depthWrite=false recommended for transparent materials, to prevent transparency issues https://discourse.threejs.org/t/threejs-and-the-transparent-problem/11553/31

  return material;
}

export { colorStr2Hex, colorAlpha, color2ShaderArr, setMaterialOpacity };