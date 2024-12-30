import {
  CanvasTexture,
  SRGBColorSpace,
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    CanvasTexture,
    SRGBColorSpace,
    Vector3
  };

import Kapsule from 'kapsule';
import { geoMercatorRaw } from 'd3-geo';

import { polar2Cartesian } from './coordTranslate.js';

export const yMercatorScale = y => 1 - (geoMercatorRaw(0, (0.5 - y) * Math.PI)[1] / Math.PI + 1) / 2;
export const yMercatorScaleInvert = y => 0.5 - geoMercatorRaw.invert(0, (2 * (1 - y) - 1) * Math.PI)[1] / Math.PI;
export const convertMercatorUV = (uvs, revert = false) => {
  const scale = revert ? yMercatorScaleInvert : yMercatorScale;
  const arr = uvs.array;
  for (let i = 0, len = arr.length; i < len; i+=2) {
    arr[i+1] = Math.max(0, Math.min(1, scale(arr[i+1])));
  }
  uvs.needsUpdate = true;
}

export default Kapsule({
  props: {
    url: {}, // (x,y,level) => str
    imgSize: { default: 256 }, // px (square)
    thresholds: { default: [5, 2, 3/4, 1/4, 1/8, 1/16] }, // in globe radius units
    cameraDistance: {},
    isInView: { onChange() { this.fetchNeededTiles() }, triggerUpdate: false }
  },

  methods: {
    fetchNeededTiles(state) {
      if (!state.url) return;

      // Safety if can't check in view tiles for higher levels
      if (!state.isInView && state.level > 3) return;

      let ctx;
      state.tilesMeta
        .filter(d => !d.fetched)
        .forEach((d) => {
          if (!state.isInView || d.hullPnts.some(state.isInView)) {
            // Fetch tile
            d.fetched = true;

            const { x, y } = d;
            const imgSize = state.imgSize;
            const img = document.createElement('img');
            img.src = state.url(x, y, state.level);
            img.crossOrigin = 'anonymous';
            img.width = imgSize;
            img.height = imgSize;
            img.onload = () => {
              !ctx && (ctx = state.canvas.getContext('2d'));
              ctx.drawImage(img, x * imgSize, y * imgSize, imgSize, imgSize);
              state.texture.needsUpdate = true;
            };
          }
        });
    },
    _destructor: function(state) {
      state.material.map = undefined;
    }
  },

  stateInit: () => ({
    tilesMeta: [],
    level: 0
  }),

  init(material, state, { mercatorProjection = true }= {}) {
    // Globe wrapping material to manipulate
    state.material = material;
    state.isMercator = mercatorProjection;
  },

  update(state, changedProps) {
    if (!state.url) return;

    let levelChanged = false;
    if (state.cameraDistance !== undefined) {
      let level;
      if (!state.url || state.cameraDistance <= 0) {
        level = 0;
      } else {
        const idx = state.thresholds.findIndex(t => t && t <= state.cameraDistance);
        level = idx < 0 ? state.thresholds.length : idx;
      }

      if(state.level !== level) {
        levelChanged = true;
        state.level = level;
      }
    }

    if (levelChanged || ['url', 'imgSize'].some(p => changedProps.hasOwnProperty(p))) {
      const gridSize = 2**state.level;
      const canvasSize = state.imgSize * gridSize;

      // Rebuild canvas
      const newCanvas = new OffscreenCanvas(canvasSize, canvasSize);
      state.canvas && newCanvas.getContext('2d').drawImage(state.canvas, 0, 0, canvasSize, canvasSize);
      state.canvas = newCanvas;
      state.texture = state.material.map = new THREE.CanvasTexture(state.canvas);
      state.texture.colorSpace = THREE.SRGBColorSpace;
      if (state.material.color) {
        state.material.color = null;
        state.material.needsUpdate = true;
      }

      // Rebuild tiles meta
      state.tilesMeta = [];
      const tileLngLen = 360 / gridSize;
      const regTileLatLen = 180 / gridSize;
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          let reproY = y,
              tileLatLen = regTileLatLen;
          if (state.isMercator) {
            // lat needs reprojection
            reproY = yMercatorScaleInvert(y / gridSize) * gridSize;
            const reproYEnd = yMercatorScaleInvert((y + 1) / gridSize) * gridSize;
            tileLatLen = (reproYEnd - reproY) * 180 / gridSize;
          }

          const lng0 = -180 + x * tileLngLen;
          const lat0 = 90 - (reproY * 180 / gridSize);
          const hullPnts = [
            [lat0, lng0],
            [lat0 - tileLatLen, lng0],
            [lat0, lng0 + tileLngLen],
            [lat0 - tileLatLen, lng0 + tileLngLen],
            [lat0 - tileLatLen / 2, lng0 + tileLngLen / 2],
          ].map(c => polar2Cartesian(...c)).map(({ x, y, z }) => new THREE.Vector3(x, y, z));

          state.tilesMeta.push({
            x,
            y,
            hullPnts,
            fetched: false
          });
        }
      }

      this.fetchNeededTiles();
    }
  }
});