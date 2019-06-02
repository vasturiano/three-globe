import {
  CircleBufferGeometry,
  Font,
  Mesh,
  MeshLambertMaterial,
  TextBufferGeometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  CircleBufferGeometry,
  Font,
  Mesh,
  MeshLambertMaterial,
  TextBufferGeometry
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';
import threeDigest from '../utils/digest';
import { polar2Cartesian } from '../utils/coordTranslate';

import defaultTypeFace from '../utils/fonts/helvetiker_regular.typeface.json';

//

export default Kapsule({
  props: {
    labelsData: { default: [] },
    labelLat: { default: 'lat' },
    labelLng: { default: 'lng' },
    labelAltitude: { default: 0 }, // in units of globe radius
    labelText: { default: 'text' },
    labelSize: { default: 0.5 }, // text height in deg
    labelTypeFace: { default: defaultTypeFace, onChange(tf, state) { state.font = new Font(tf) }},
    labelColor: { default: () => 'lightgrey' },
    labelRotation: { default: 0 }, // clockwise degrees, relative to the latitute parallel plane
    labelResolution: { default: 12 }, // how many segments in the text's curves
    labelIncludeDot: { default: true },
    labelDotRadius: { default: 0.1 }, // in deg
    labelDotOrientation: { default: () => 'bottom' } // right, top, bottom
  },

  init(threeObj, state) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;
  },

  update(state) {
    // Data accessors
    const latAccessor = accessorFn(state.labelLat);
    const lngAccessor = accessorFn(state.labelLng);
    const altitudeAccessor = accessorFn(state.labelAltitude);
    const textAccessor = accessorFn(state.labelText);
    const sizeAccessor = accessorFn(state.labelSize);
    const rotationAccessor = accessorFn(state.labelRotation);
    const colorAccessor = accessorFn(state.labelColor);
    const includeDotAccessor = accessorFn(state.labelIncludeDot);
    const dotRadiusAccessor = accessorFn(state.labelDotRadius);
    const dotOrientationAccessor = accessorFn(state.labelDotOrientation);

    const orientations = new Set(['right', 'top', 'bottom']);

    const pxPerDeg = 2 * Math.PI * GLOBE_RADIUS / 360;

    threeDigest(state.labelsData, state.scene, {
      exitObj: emptyObject,
      createObj: () => {
        const material = new MeshLambertMaterial();

        const obj = new Mesh(new CircleBufferGeometry(1, 16), material); // dot & container
        obj.add(new Mesh(undefined, material)); // text

        obj.__globeObjType = 'label'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        const dotObj = obj;
        const [textObj] = obj.children;

        // update color
        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        obj.material.color.set(colorStr2Hex(color));
        obj.material.transparent = opacity < 1;
        obj.material.opacity = opacity;

        // update dot
        const includeDot = includeDotAccessor(d);
        let dotOrient = dotOrientationAccessor(d);
        !includeDot || !orientations.has(dotOrient) && (dotOrient = 'bottom');

        // size dot
        const dotR = includeDot ? dotRadiusAccessor(d) * pxPerDeg : 1e-12;
        dotObj.geometry.scale(dotR, dotR, 1);

        // create text geometry
        const textHeight = sizeAccessor(d) * pxPerDeg;
        textObj.geometry = new TextBufferGeometry(textAccessor(d), {
          font: state.font,
          size: textHeight,
          height: 0,
          curveSegments: state.labelResolution
        });

        // center text (otherwise anchor is on bottom-left)
        dotOrient !== 'right' && textObj.geometry.center();

        if (includeDot) {
          // translate text
          const padding = dotR * 2;

          textObj.geometry.translate({
              // x
              right: padding,
              top: 0,
              bottom: 0
            }[dotOrient], {
              // y
              right: -textHeight / 2, // center vertically
              top: padding + textHeight / 2,
              bottom: -padding - textHeight / 2
            }[dotOrient],
          0);
        }

        // update position
        const lat = latAccessor(d);
        const lng = lngAccessor(d);
        const alt = altitudeAccessor(d);

        // position center
        Object.assign(obj.position, polar2Cartesian(lat, lng, alt));

        // orientate outwards
        const outDir = polar2Cartesian(lat, lng, alt + 10);
        obj.lookAt(outDir.x, outDir.y, outDir.z);

        // rotate clockwise relative to lat parallel
        obj.rotateZ(-rotationAccessor(d) * Math.PI / 180);
      }
    });
  }
});
