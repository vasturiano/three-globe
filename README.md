# ThreeJS Globe Visualization

[![NPM](https://nodei.co/npm/three-globe.png?compact=true)](https://nodei.co/npm/three-globe/)

<p align="center">
     <a href="//vasturiano.github.io/three-globe/example/basic/"><img width="80%" src="//vasturiano.github.io/three-globe/example/sshot.png"></a>
</p>

Largely inspired by the [WebGL Globe](https://experiments.withgoogle.com/chrome/globe), this is a [ThreeJS](https://threejs.org/) WebGL class to represent data visualization layers on a globe, using spherical projection.

## Quick start

```
import ThreeGlobe from 'three-globe';
```
or
```
const ThreeGlobe = require('three-globe');
```
or even
```
<script src="//unpkg.com/three-globe"></script>
```
then
```
const myGlobe = new ThreeGlobe()
    .globeImageUrl(<imageUrl>)
    .pointsData(<myData>);

const myScene = new THREE.Scene();
myScene.add(myGlobe);
```

## API reference

| Method | Description | Default |
| --- | --- | :--: |
| <b>globeImageUrl</b>([<i>string</i>]) | Getter/setter for the URL of the image used in the material that wraps the globe. If no image is provided, the globe is represented as a black sphere. | `null` |
| <b>pointsData</b>([<i>array</i>]) | Getter/setter for the list of points to represent in the points map layer. Each point is displayed as a cylindrical 3D object rising perpendicular from the surface of the globe. | `[]` |
| <b>pointLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's center latitude coordinate. | `lat` |
| <b>pointLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's center longitude coordinate. | `lat` |
| <b>pointColor</b>([<i>str</i> or <i>fn</i>]) | Point object accessor function or attribute for the cylinder color. | `() => '#ffffaa'` |
| <b>pointHeight</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's altitude in terms of globe radius units (`0` = 0 altitude (flat circle), `1` = globe radius). | `0.1` |
| <b>pointRadius</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's radius, in angular degrees. | `0.25` |
| <b>pointResolution</b>([<i>num</i>]) | Getter/setter for the radial geometric resolution of each cylinder, expressed in how many slice segments to divide the circumference. Higher values yield smoother cylinders. | 12 |
| <b>pointsMerge</b>([<i>boolean</i>]) | Getter/setter for whether to merge all the point meshes into a single ThreeJS object, for improved rendering performance. Visually both options are equivalent, setting this option only affects the internal organization of the ThreeJS objects. | `false` |
| <b>customLayerData</b>([<i>array</i>]) | Getter/setter for the list of items to represent in the custom map layer. Each item is rendered according to the `customThreeObject` method. | `[]` |
| <b>customThreeObject</b>([<i>Object3d</i>, <i>str</i> or <i>fn</i>]) | Object accessor function or attribute for generating a custom 3d object to render as part of the custom map layer. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). | <b>customThreeObject</b>([<i>Object3d</i>, <i>str</i> or <i>fn</i>]) | Object accessor function or attribute for generating a custom 3d object to render as part of the custom map layer. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). The callback method's signature includes the object item as well as the globe radius: `customThreeObject((item, globeRadius) => { ... })`. || `null` |
| <b>getCoords</b>(<i>lat</i>, <i>lng</i> [,<i>altitude</i>]) | Utility method to translate spherical coordinates. Given a pair of latitude/longitude coordinates and optionally altitude (in terms of globe radius units), returns the equivalent `{x, y, z}` euclidean spatial coordinates. ||