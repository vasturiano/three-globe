import tinyColor from 'tinycolor2';

const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
const colorAlpha = str => isNaN(str) ? tinyColor(str).getAlpha(): 1;
const color2ShaderArr = (str, includeAlpha = true) => {
  const rgba = tinyColor(str).toRgb();
  const rgbArr = ['r', 'g', 'b'].map(d => rgba[d] / 255);

  return includeAlpha ? [...rgbArr, rgba.a] : rgbArr;
};

function setMaterialOpacity(material, opacity, depthWrite) {
  material.opacity = opacity;
  material.transparent = opacity < 1;
  material.depthWrite = depthWrite === undefined ? opacity >= 1 : depthWrite; // depthWrite=false recommended for transparent materials, to prevent transparency issues https://discourse.threejs.org/t/threejs-and-the-transparent-problem/11553/31

  return material;
}

export { colorStr2Hex, colorAlpha, color2ShaderArr, setMaterialOpacity };