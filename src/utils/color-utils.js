import tinyColor from 'tinycolor2';

const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
const colorAlpha = str => isNaN(str) ? tinyColor(str).getAlpha(): 1;
const color2ShaderArr = (str, includeAlpha = true) => {
  const rgba = tinyColor(str).toRgb();
  const rgbArr = ['r', 'g', 'b'].map(d => rgba[d] / 255);

  return includeAlpha ? [...rgbArr, rgba.a] : rgbArr;
};

export { colorStr2Hex, colorAlpha, color2ShaderArr };