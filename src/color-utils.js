import tinyColor from 'tinycolor2';

const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
const colorAlpha = str => isNaN(str) ? tinyColor(str).getAlpha(): 1;
const color2ShaderArr = str => {
  const rgba = tinyColor(str).toRgb();
  return [ ...['r', 'g', 'b'].map(d => rgba[d] / 255), rgba.a];
};

export { colorStr2Hex, colorAlpha, color2ShaderArr };