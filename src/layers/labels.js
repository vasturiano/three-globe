import {
  Font,
  Mesh,
  MeshLambertMaterial,
  TextGeometry
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  Font,
  Mesh,
  MeshLambertMaterial,
  TextGeometry
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
    labelSize: { default: 10 },
    labelTypeFace: { default: defaultTypeFace, onChange(tf, state) { state.font = new Font(tf) }},
    labelColor: { default: () => 'lightgrey' },
    labelRotation: { default: 0 }, // clockwise degrees, relative to the latitute parallel plane
    labelResolution: { default: 12 } // how many segments in the text's curves
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

    threeDigest(state.labelsData, state.scene, {
      exitObj: emptyObject,
      createObj: () => {
        const obj = new Mesh(
          undefined,
          new MeshLambertMaterial()
        );

        obj.__globeObjType = 'label'; // Add object type

        return obj;
      },
      updateObj: (obj, d) => {
        const lat = latAccessor(d);
        const lng = lngAccessor(d);
        const alt = altitudeAccessor(d);

        // position label center
        Object.assign(obj.position, polar2Cartesian(lat, lng, alt));

        // orientate outwards
        const outDir = polar2Cartesian(lat, lng, alt + 10);
        obj.lookAt(outDir.x, outDir.y, outDir.z);

        // rotate clockwise relative to lat parallel
        obj.rotateZ(-rotationAccessor(d) * Math.PI / 180);

        // create geometry
        obj.geometry = new TextGeometry(textAccessor(d), {
          font: state.font,
          size: sizeAccessor(d) * GLOBE_RADIUS * 1e-3,
          height: 0,
          curveSegments: state.labelResolution
        });

        // center it
        obj.geometry.center();

        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        obj.material.color.set(colorStr2Hex(color));
        obj.material.transparent = opacity < 1;
        obj.material.opacity = opacity;
      }
    });


  }
});
