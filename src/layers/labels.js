import {
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  Vector3
} from 'three';

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';

const THREE = {
  ...(window.THREE
    ? window.THREE // Prefer consumption from global THREE, if exists
    : {
      BoxGeometry,
      CircleGeometry,
      DoubleSide,
      Group,
      Mesh,
      MeshLambertMaterial,
      TextGeometry,
      Vector3
    }
  ),
  Font,
  TextGeometry
};

import Kapsule from 'kapsule';
import accessorFn from 'accessor-fn';
import { Tween, Easing } from '@tweenjs/tween.js';

import { colorStr2Hex, colorAlpha } from '../utils/color-utils';
import { emptyObject } from '../utils/gc';
import { GLOBE_RADIUS } from '../constants';
import ThreeDigest from '../utils/digest';
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
    labelTypeFace: { default: defaultTypeFace, onChange(tf, state) { state.font = new THREE.Font(tf) }},
    labelColor: { default: () => 'lightgrey' },
    labelRotation: { default: 0 }, // clockwise degrees, relative to the latitute parallel plane
    labelResolution: { default: 3 }, // how many segments in the text's curves
    labelIncludeDot: { default: true },
    labelDotRadius: { default: 0.1 }, // in deg
    labelDotOrientation: { default: () => 'bottom' }, // right, top, bottom
    labelsTransitionDuration: { default: 1000, triggerUpdate: false } // ms
  },

  init(threeObj, state, { tweenGroup }) {
    // Clear the scene
    emptyObject(threeObj);

    // Main three object to manipulate
    state.scene = threeObj;

    state.tweenGroup = tweenGroup;

    const circleGeometry = new THREE.CircleGeometry(1, 32);
    state.dataMapper = new ThreeDigest(threeObj, { objBindAttr: '__threeObjLabel' })
      .onCreateObj(() => {
        const material = new THREE.MeshLambertMaterial();
        material.side = DoubleSide;

        const obj = new THREE.Group(); // container

        obj.add(new THREE.Mesh(circleGeometry, material)); // dot
        const textObj = new THREE.Mesh(undefined, material);
        obj.add(textObj); // text

        // text invisible bounding box (raycaster trap)
        const bbObj = new THREE.Mesh();
        bbObj.visible = false;
        textObj.add(bbObj);

        obj.__globeObjType = 'label'; // Add object type

        return obj;
      });
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

    state.dataMapper
      .onUpdateObj((obj, d) => {
        const [dotObj, textObj] = obj.children;
        const [bbObj] = textObj.children;

        // update color
        const color = colorAccessor(d);
        const opacity = colorAlpha(color);
        textObj.material.color.set(colorStr2Hex(color));
        textObj.material.transparent = opacity < 1;
        textObj.material.opacity = opacity;

        // update dot
        const includeDot = includeDotAccessor(d);
        let dotOrient = dotOrientationAccessor(d);
        !includeDot || !orientations.has(dotOrient) && (dotOrient = 'bottom');

        // size dot
        const dotR = includeDot ? +dotRadiusAccessor(d) * pxPerDeg : 1e-12;
        dotObj.scale.x = dotObj.scale.y = dotR;

        // create text geometry
        const textHeight = +sizeAccessor(d) * pxPerDeg;
        textObj.geometry && textObj.geometry.dispose();
        textObj.geometry = new THREE.TextGeometry(textAccessor(d), {
          font: state.font,
          size: textHeight,
          depth: 0,
          height: 0,
          curveSegments: state.labelResolution
        });

        // update text convex hull/bounding box
        bbObj.geometry && bbObj.geometry.dispose();
        textObj.geometry.computeBoundingBox();
        bbObj.geometry = new THREE.BoxGeometry(...new THREE.Vector3()
          .subVectors(textObj.geometry.boundingBox.max, textObj.geometry.boundingBox.min)
          .toArray()
        );

        // center text (otherwise anchor is on bottom-left)
        dotOrient !== 'right' && textObj.geometry.center();

        if (includeDot) {
          // translate text
          const padding = dotR + textHeight / 2;

          dotOrient === 'right' && (textObj.position.x = padding);

          textObj.position.y = {
            right: -textHeight / 2, // center vertically
            top: padding + textHeight / 2,
            bottom: -padding - textHeight / 2
          }[dotOrient];
        }

        // animations
        const applyPosition = td => {
          const { lat, lng, alt, rot, scale } = obj.__currentTargetD = td;

          // position center
          Object.assign(obj.position, polar2Cartesian(lat, lng, alt));

          // rotate
          obj.lookAt(state.scene.localToWorld(new THREE.Vector3(0, 0, 0))); // face globe (local) center
          obj.rotateY(Math.PI); // face outwards

          // rotate clockwise relative to lat parallel
          obj.rotateZ(-rot * Math.PI / 180);

          // scale it
          obj.scale.x = obj.scale.y = obj.scale.z = scale;
        };

        const targetD = {
          lat: +latAccessor(d),
          lng: +lngAccessor(d),
          alt: +altitudeAccessor(d),
          rot: +rotationAccessor(d),
          scale: 1
        };
        const currentTargetD = obj.__currentTargetD || Object.assign({}, targetD, { scale: 1e-12 });

        if (Object.keys(targetD).some(k => currentTargetD[k] !== targetD[k])) {
          if (!state.labelsTransitionDuration || state.labelsTransitionDuration < 0) {
            // set final position
            applyPosition(targetD);
          } else {
            // animate
            state.tweenGroup.add(new Tween(currentTargetD)
              .to(targetD, state.labelsTransitionDuration)
              .easing(Easing.Quadratic.InOut)
              .onUpdate(applyPosition)
              .start()
            );
          }
        }
      })
      .digest(state.labelsData);
  }
});
