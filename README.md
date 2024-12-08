ThreeJS Globe Visualization
===========================

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![NPM Downloads][npm-downloads-img]][npm-downloads-url]

<p align="center">
  <a href="//vasturiano.github.io/three-globe/example/basic/"><img width="80%" src="https://vasturiano.github.io/three-globe/example/preview.png"></a>
</p>

Largely inspired by [WebGL Globe](https://experiments.withgoogle.com/chrome/globe), this is a [ThreeJS](https://threejs.org/) WebGL class to represent data visualization layers on a globe, using a spherical projection.

See also the [standalone version](https://github.com/vasturiano/globe.gl), and the [react-three-fiber bindings](https://github.com/vasturiano/r3f-globe).

#### Check out the examples:
* [Basic](https://vasturiano.github.io/three-globe/example/basic/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/basic/index.html))
* [Arc Links](https://vasturiano.github.io/three-globe/example/links/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/links/index.html))
* [Country Polygons](https://vasturiano.github.io/three-globe/example/country-polygons/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/country-polygons/index.html))
* [Path lines](https://vasturiano.github.io/three-globe/example/paths/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/paths/index.html))
* [Heatmap](https://vasturiano.github.io/three-globe/example/heatmap/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/heatmap/index.html))
* [Hexagonal Binning](https://vasturiano.github.io/three-globe/example/hexbin/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/hexbin/index.html))
* [Hexed Country Polygons](https://vasturiano.github.io/three-globe/example/hexed-polygons/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/hexed-polygons/index.html))
* [Tiles](https://vasturiano.github.io/three-globe/example/tiles/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/tiles/index.html))
* [Ripple Rings](https://vasturiano.github.io/three-globe/example/ripples/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/ripples/index.html))
* [Clouds](https://vasturiano.github.io/three-globe/example/clouds/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/clouds/index.html))
* [Solar Terminator](https://vasturiano.github.io/three-globe/example/solar-terminator/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/solar-terminator/index.html))
* [Labels](https://vasturiano.github.io/three-globe/example/labels/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/labels/index.html))
* [HTML Markers](https://vasturiano.github.io/three-globe/example/html-markers/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/html-markers/index.html))
* [Satellites](https://vasturiano.github.io/three-globe/example/satellites/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/satellites/index.html))
* [Custom Globe Material](https://vasturiano.github.io/three-globe/example/custom-material/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/custom-material/index.html))
* [Custom Layer](https://vasturiano.github.io/three-globe/example/custom/) ([source](https://github.com/vasturiano/three-globe/blob/master/example/custom/index.html))

## Quick start

```js
import ThreeGlobe from 'three-globe';
```
or using a *script* tag
```html
<script src="//unpkg.com/three-globe"></script>
```
then
```js
const myGlobe = new ThreeGlobe()
  .globeImageUrl(myImageUrl)
  .pointsData(myData);

const myScene = new THREE.Scene();
myScene.add(myGlobe);
```

## API reference

* [Initialisation](#initialisation)
* [Globe Layer](#globe-layer)
* [Points Layer](#points-layer)
* [Arcs Layer](#arcs-layer)
* [Polygons Layer](#polygons-layer)
* [Paths Layer](#paths-layer)
* [Heatmaps Layer](#heatmaps-layer)
* [Hex Bin Layer](#hex-bin-layer)
* [Hexed Polygons Layer](#hexed-polygons-layer)
* [Tiles Layer](#tiles-layer)
* [Rings Layer](#rings-layer)
* [Labels Layer](#labels-layer)
* [HTML Elements Layer](#html-elements-layer)
* [3D Objects Layer](#3d-objects-layer)
* [Custom Layer](#custom-layer)
* [Utility](#utility)
* [Render Options](#render-options)

### Initialisation
```js
new ThreeGlobe({ configOptions })
```

| Config options | Description | Default |
| --- | --- | :--: |
| <b>waitForGlobeReady</b>: <i>boolean</i> | Whether to wait until the globe wrapping image has been fully loaded before rendering the globe or any of the data layers. | `true` |
| <b>animateIn</b>: <i>boolean</i> | Whether to animate the globe initialization, by scaling and rotating the globe into its inital position. | `true` |

### Globe Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>globeImageUrl</b>([<i>url</i>]) | Getter/setter for the URL of the image used in the material that wraps the globe. This image should follow an [equirectangular projection](https://en.wikipedia.org/wiki/Equirectangular_projection). If no image is provided, the globe is represented as a black sphere. | `null` |
| <b>bumpImageUrl</b>([<i>url</i>]) | Getter/setter for the URL of the image used to create a [bump map](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.bumpMap) in the material, to represent the globe's terrain. This image should follow an [equirectangular projection](https://en.wikipedia.org/wiki/Equirectangular_projection). | `null` |
| <b>showGlobe</b>([<i>boolean</i>]) | Getter/setter for whether to show the globe surface itself. | `true` |
| <b>showGraticules</b>([<i>boolean</i>]) | Getter/setter for whether to show a graticule grid demarking latitude and longitude lines at every 10 degrees. | `false` |
| <b>showAtmosphere</b>([<i>boolean</i>]) | Getter/setter for whether to show a bright halo surrounding the globe, representing the atmosphere. | `true` |
| <b>atmosphereColor</b>([<i>str</i>]) | Getter/setter for the color of the atmosphere. | `lightskyblue` |
| <b>atmosphereAltitude</b>([<i>str</i>]) | Getter/setter for the max altitude of the atmosphere, in terms of globe radius units. | 0.15 |
| <b>globeMaterial</b>([<i>material</i>]) | Getter/setter of the ThreeJS material used to wrap the globe. Can be used for more advanced styling of the globe, like in [this example](https://github.com/vasturiano/three-globe/blob/master/example/custom-material/index.html). | [MeshPhongMaterial](https://threejs.org/docs/#api/en/materials/MeshPhongMaterial) |
| <b>onGlobeReady</b>(<i>fn</i>) | Callback function to invoke immediately after the globe has been initialized and visible on the scene. | - |

### Points Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>pointsData</b>([<i>array</i>]) | Getter/setter for the list of points to represent in the points map layer. Each point is displayed as a cylindrical 3D object rising perpendicularly from the surface of the globe. | `[]` |
| <b>pointLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's center latitude coordinate. | `lat` |
| <b>pointLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's center longitude coordinate. | `lng` |
| <b>pointColor</b>([<i>str</i> or <i>fn</i>]) | Point object accessor function or attribute for the cylinder color. | `() => '#ffffaa'` |
| <b>pointAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's altitude in terms of globe radius units (`0` = 0 altitude (flat circle), `1` = globe radius). | 0.1 |
| <b>pointRadius</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the cylinder's radius, in angular degrees. | 0.25 |
| <b>pointResolution</b>([<i>num</i>]) | Getter/setter for the radial geometric resolution of each cylinder, expressed in how many slice segments to divide the circumference. Higher values yield smoother cylinders. | 12 |
| <b>pointsMerge</b>([<i>boolean</i>]) | Getter/setter for whether to merge all the point meshes into a single ThreeJS object, for improved rendering performance. Visually both options are equivalent, setting this option only affects the internal organization of the ThreeJS objects. | `false` |
| <b>pointsTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate point changes involving geometry modifications. A value of `0` will move the objects immediately to their final position. New objects are animated by scaling them from the ground up. Only works if `pointsMerge` is disabled. | 1000 |

### Arcs Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>arcsData</b>([<i>array</i>]) | Getter/setter for the list of links to represent in the arcs map layer. Each link is displayed as an arc line that rises from the surface of the globe, connecting the start and end coordinates. | `[]` |
| <b>arcStartLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the line's start latitude coordinate. | `startLat` |
| <b>arcStartLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the line's start longitude coordinate. | `startLng` |
| <b>arcEndLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the line's end latitude coordinate. | `endLat` |
| <b>arcEndLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the line's end longitude coordinate. | `endLng` |
| <b>arcColor</b>([<i>str</i>, <i>[str, ...]</i> or <i>fn</i>]) | Arc object accessor function or attribute for the line's color. Also supports color gradients by passing an array of colors, or a color interpolator function. | `() => '#ffffaa'` |
| <b>arcAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the arc's maximum altitude (ocurring at the half-way distance between the two points) in terms of globe radius units (`0` = 0 altitude (ground line), `1` = globe radius). If a value of `null` or `undefined` is used, the altitude is automatically set proportionally to the distance between the two points, according to the scale set in `arcAltitudeAutoScale`.  | `null` |
| <b>arcAltitudeAutoScale</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the scale of the arc's automatic altitude, in terms of units of the great-arc distance between the two points. A value of `1` indicates the arc should be as high as its length on the ground. Only applicable if `arcAltitude` is not set. | 0.5 |
| <b>arcStroke</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the line's diameter, in angular degrees. A value of `null` or `undefined` will render a [ThreeJS Line](https://threejs.org/docs/#api/objects/Line) whose width is constant (`1px`) regardless of the camera distance. Otherwise, a [TubeGeometry](https://threejs.org/docs/#api/en/geometries/TubeGeometry) is used. | `null` |
| <b>arcCurveResolution</b>([<i>num</i>]) | Getter/setter for the arc's curve resolution, expressed in how many straight line segments to divide the curve by. Higher values yield smoother curves. | 64 |
| <b>arcCircularResolution</b>([<i>num</i>]) | Getter/setter for the radial geometric resolution of each line, expressed in how many slice segments to divide the tube's circumference. Only applicable when using Tube geometries (defined `arcStroke`). | 6 |
| <b>arcDashLength</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the length of the dashed segments in the arc, in terms of relative length of the whole line (`1` = full line length). | 1 |
| <b>arcDashGap</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the length of the gap between dash segments, in terms of relative line length. | 0 |
| <b>arcDashInitialGap</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the length of the initial gap before the first dash segment, in terms of relative line length. | 0 |
| <b>arcDashAnimateTime</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Arc object accessor function, attribute or a numeric constant for the time duration (in `ms`) to animate the motion of dash positions from the start to the end point for a full line length. A value of `0` disables the animation. | 0 |
| <b>arcsTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate arc changes involving geometry modifications. A value of `0` will move the arcs immediately to their final position. New arcs are animated by rising them from the ground up. | 1000 |

### Polygons Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>polygonsData</b>([<i>array</i>]) | Getter/setter for the list of polygon shapes to represent in the polygons map layer. Each polygon is displayed as a shaped cone that extrudes from the surface of the globe. | `[]` |
| <b>polygonGeoJsonGeometry</b>([<i>str</i> or <i>fn</i>]) | Polygon object accessor function or attribute for the GeoJson geometry specification of the polygon's shape. The returned value should have a minimum of two fields: `type` and `coordinates`. Only GeoJson geometries of type `Polygon` or `MultiPolygon` are supported, other types will be skipped. | `geometry` |
| <b>polygonCapColor</b>([<i>str</i> or <i>fn</i>]) | Polygon object accessor function or attribute for the color of the top surface. | `() => '#ffffaa'` |
| <b>polygonCapMaterial</b>([<i>material</i>, <i>str</i> or <i>fn</i>]) | Polygon object accessor function, attribute or material object for the [ThreeJS material](https://threejs.org/docs/#api/en/materials/Material) to use in the top surface. This property takes precedence over `polygonCapColor`, which will be ignored if both are defined. | - |
| <b>polygonSideColor</b>([<i>str</i> or <i>fn</i>]) | Polygon object accessor function or attribute for the color of the cone sides. | `() => '#ffffaa'` |
| <b>polygonSideMaterial</b>([<i>material</i>, <i>str</i> or <i>fn</i>]) | Polygon object accessor function, attribute or material object for the [ThreeJS material](https://threejs.org/docs/#api/en/materials/Material) to use in the cone sides. This property takes precedence over `polygonSideColor`, which will be ignored if both are defined. | - |
| <b>polygonStrokeColor</b>([<i>str</i> or <i>fn</i>]) | Polygon object accessor function or attribute for the color to stroke the polygon perimeter. A falsy value will disable the stroking. | - |
| <b>polygonAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Polygon object accessor function, attribute or a numeric constant for the polygon cone's altitude in terms of globe radius units (`0` = 0 altitude (flat polygon), `1` = globe radius). | 0.01 |
| <b>polygonCapCurvatureResolution</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Polygon object accessor function, attribute or a numeric constant for the resolution (in angular degrees) of the cap surface curvature. The finer the resolution, the more the polygon is fragmented into smaller faces to approximate the spheric surface, at the cost of performance. | 5 |
| <b>polygonsTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate polygon altitude changes. A value of `0` will size the cone immediately to their final altitude. New polygons are animated by rising them from the ground up. | 1000 |

### Paths Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>pathsData</b>([<i>array</i>]) | Getter/setter for the list of lines to represent in the paths map layer. Each path is displayed as a line that connects all the coordinate pairs in the path array. | `[]` |
| <b>pathPoints</b>([<i>array</i>, <i>str</i> or <i>fn</i>]) | Path object accessor function, attribute or an array for the set of points that define the path line. By default, each path point is assumed to be a 2-position array (`[<lat>, <lon>]`). This default behavior can be modified using the `pathPointLat` and `pathPointLng` methods. | `pnts => pnts` |
| <b>pathPointLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path point object accessor function, attribute or a numeric constant for the latitude coordinate. | `arr => arr[0]` |
| <b>pathPointLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path point object accessor function, attribute or a numeric constant for the longitude coordinate. | `arr => arr[1]` |
| <b>pathPointAlt</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path point object accessor function, attribute or a numeric constant for the point altitude, in terms of globe radius units (`0` = 0 altitude (ground), `1` = globe radius). | 0.001 |
| <b>pathResolution</b>([<i>num</i>]) | Getter/setter for the path's angular resolution, in lat/lng degrees. If the ground distance (excluding altitude) between two adjacent path points is larger than this value, the line segment will be interpolated in order to approximate the curvature of the sphere surface. Lower values yield more perfectly curved lines, at the cost of performance. | 2 |
| <b>pathColor</b>([<i>str</i>, <i>[str, ...]</i> or <i>fn</i>]) | Path object accessor function or attribute for the line's color. Also supports color gradients by passing an array of colors, or a color interpolator function. Transparent colors are not supported in Fat Lines with set width. | `() => '#ffffaa'` |
| <b>pathStroke</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path object accessor function, attribute or a numeric constant for the line's diameter, in angular degrees. A value of `null` or `undefined` will render a [ThreeJS Line](https://threejs.org/docs/#api/objects/Line) whose width is constant (`1px`) regardless of the camera distance. Otherwise, a [FatLine](https://github.com/vasturiano/three-fatline) is used. | `null` |
| <b>pathDashLength</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path object accessor function, attribute or a numeric constant for the length of the dashed segments in the path line, in terms of relative length of the whole line (`1` = full line length). | 1 |
| <b>pathDashGap</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path object accessor function, attribute or a numeric constant for the length of the gap between dash segments, in terms of relative line length. | 0 |
| <b>pathDashInitialGap</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path object accessor function, attribute or a numeric constant for the length of the initial gap before the first dash segment, in terms of relative line length. | 0 |
| <b>pathDashAnimateTime</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Path object accessor function, attribute or a numeric constant for the time duration (in `ms`) to animate the motion of dash positions from the start to the end point for a full line length. A value of `0` disables the animation. | 0 |
| <b>pathTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate path changes. A value of `0` will move the paths immediately to their final position. New paths are animated from start to end. | 1000 |

### Heatmaps Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>heatmapsData</b>([<i>array</i>]) | Getter/setter for the list of heatmap datasets to represent in the heatmaps map layer. Each set of points is represented as an individual global heatmap with varying color and/or altitude, according to the point density. It uses a [Gaussian KDE](https://en.wikipedia.org/wiki/Kernel_density_estimation) to perform the density estimation, based on the great-arc distance between points. | `[]` |
| <b>heatmapPoints</b>([<i>array</i>, <i>str</i> or <i>fn</i>]) | Heatmap object accessor function, attribute or an array for the set of points that define the heatmap. By default, each point is assumed to be a 2-position array (`[<lat>, <lon>]`). This default behavior can be modified using the `heatmapPointLat` and `heatmapPointLng` methods. | `pnts => pnts` |
| <b>heatmapPointLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap point object accessor function, attribute or a numeric constant for the latitude coordinate. | `arr => arr[0]` |
| <b>heatmapPointLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap point object accessor function, attribute or a numeric constant for the longitude coordinate. | `arr => arr[1]` |
| <b>heatmapPointWeight</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap point object accessor function, attribute or a numeric constant for the weight of the point. The weight of a point determines its influence on the density of the surrounding area. | 1 |
| <b>heatmapBandwidth</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap object accessor function, attribute or a numeric constant for the heatmap bandwidth, in angular degrees. The bandwidth is an internal parameter of the [Gaussian kernel function](https://en.wikipedia.org/wiki/Gaussian_function) and defines how localized is the influence of a point on distant locations. A narrow bandwidth leads to a more spiky representation, while a broad one has smoother curves. | 2.5 |
| <b>heatmapColorFn</b>([<i>str</i> or <i>fn</i>]) | Heatmap object accessor function or attribute for the color interpolator function to represent density in the heatmap. This function should receive a number between `0` and `1` (or potentially higher if saturation > 1), and return a color string. | [Turbo colormap](https://blog.research.google/2019/08/turbo-improved-rainbow-colormap-for.html) interpolator with fading opacity |
| <b>heatmapColorSaturation</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap object accessor function, attribute or a numeric constant for the color scale saturation. The saturation is a multiplier of the normalized density value (`[0,1]`) before passing it to the color interpolation function. It can be used to dampen outlier peaks in density and bring the data floor into view. | 1.5 |
| <b>heatmapBaseAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap object accessor function, attribute or a numeric constant for the heatmap base floor altitude in terms of globe radius units (`0` = 0 altitude, `1` = globe radius). | 0.01 |
| <b>heatmapTopAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Heatmap object accessor function, attribute or a numeric constant for the heatmap top peak altitude in terms of globe radius units (`0` = 0 altitude, `1` = globe radius). An equal value to the base altitude will yield a surface flat heatmap. If a top altitude is set, the variations in density will be used to define the altitude curves between base and top. | - |
| <b>heatmapsTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate heatmap changes. A value of `0` will set the heatmap colors/altitudes immediately in their final position. New heatmaps are animated by rising them from the ground up and gently fading in through the color scale. | 0 |

### Hex Bin Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>hexBinPointsData</b>([<i>array</i>]) | Getter/setter for the list of points to aggregate using the hex bin map layer. Each point is added to an hexagonal prism 3D object that represents all the points within a tesselated portion of the space. | `[]` |
| <b>hexBinPointLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the latitude coordinate. | `lat` |
| <b>hexBinPointLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the longitude coordinate. | `lng` |
| <b>hexBinPointWeight</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Point object accessor function, attribute or a numeric constant for the weight of the point. Weights for points in the same bin are summed and determine the hexagon default altitude. | 1 |
| <b>hexBinResolution</b>([<i>num</i>]) | The geographic binning resolution as defined by [H3](https://uber.github.io/h3/#/documentation/core-library/resolution-table). Determines the area of the hexagons that tesselate the globe's surface. Accepts values between `0` and `15`. Level 0 partitions the earth in 122 (mostly) hexagonal cells. Each subsequent level sub-divides the previous in roughly 7 hexagons. | 4 |
| <b>hexMargin</b>([<i>num</i> or <i>fn</i>]) | The radial margin of each hexagon. Margins above `0` will create gaps between adjacent hexagons and serve only a visual purpose, as the data points within the margin still contribute to the hexagon's data. The margin is specified in terms of fraction of the hexagon's surface diameter. Values below `0` or above `1` are disadvised. This property also supports using an accessor method based on the hexagon's aggregated data, following the syntax: `hexMargin(({ points, sumWeight, center: { lat, lng }}) => ...)`. This method should return a numeric constant. | 0.2 |
| <b>hexAltitude</b>([<i>num</i> or <i>fn</i>]) | The altitude of each hexagon, in terms of globe radius units (`0` = 0 altitude (flat hexagon), `1` = globe radius). This property also supports using an accessor method based on the hexagon's aggregated data, following the syntax: `hexAltitude(({ points, sumWeight, center: { lat, lng }}) => ...)`. This method should return a numeric constant. | `({ sumWeight }) => sumWeight * 0.01` |
| <b>hexTopCurvatureResolution</b>([<i>num</i>]) | The resolution (in angular degrees) of the top surface curvature. The finer the resolution, the more the top area is fragmented into smaller faces to approximate the spheric surface, at the cost of performance. | 5 |
| <b>hexTopColor</b>([<i>fn</i>]) | Accessor method for each hexagon's top color. The method should follow the signature: `hexTopColor(({ points, sumWeight, center: { lat, lng }}) => ...)` and return a color string. | `() => '#ffffaa'` |
| <b>hexSideColor</b>([<i>fn</i>]) | Accessor method for each hexagon's side color. The method should follow the signature: `hexSideColor(({ points, sumWeight, center: { lat, lng }}) => ...)` and return a color string. | `() => '#ffffaa'` |
| <b>hexBinMerge</b>([<i>boolean</i>]) | Getter/setter for whether to merge all the hexagon meshes into a single ThreeJS object, for improved rendering performance. Visually both options are equivalent, setting this option only affects the internal organization of the ThreeJS objects. | `false` |
| <b>hexTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate hexagon changes related to geometry modifications (altitude, radius). A value of `0` will move the hexagons immediately to their final position. New hexagons are animated by scaling them from the ground up. Only works if `hexBinMerge` is disabled. | 1000 |

### Hexed Polygons Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>hexPolygonsData</b>([<i>array</i>]) | Getter/setter for the list of polygon shapes to represent in the hexed polygons map layer. Each polygon is displayed as a tesselated group of hexagons that approximate the polygons shape according to the resolution specified in `hexPolygonResolution`. | `[]` |
| <b>hexPolygonGeoJsonGeometry</b>([<i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function or attribute for the GeoJson geometry specification of the polygon's shape. The returned value should have a minimum of two fields: `type` and `coordinates`. Only GeoJson geometries of type `Polygon` or `MultiPolygon` are supported, other types will be skipped. | `geometry` |
| <b>hexPolygonColor</b>([<i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function or attribute for the color of each hexagon in the polygon. | `() => '#ffffaa'` |
| <b>hexPolygonAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function, attribute or a numeric constant for the polygon's hexagons altitude in terms of globe radius units (`0` = 0 altitude, `1` = globe radius). | 0.001 |
| <b>hexPolygonResolution</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function, attribute or a numeric constant for the geographic binning resolution as defined by [H3](https://uber.github.io/h3/#/documentation/core-library/resolution-table). Determines the area of the hexagons that tesselate the globe's surface. Accepts values between `0` and `15`. Level 0 partitions the earth in 122 (mostly) hexagonal cells. Each subsequent level sub-divides the previous in roughly 7 hexagons. | 3 |
| <b>hexPolygonMargin</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function, attribute or a numeric constant for the radial margin of each hexagon. Margins above `0` will create gaps between adjacent hexagons within a polygon. The margin is specified in terms of fraction of the hexagon's surface diameter. Values below `0` or above `1` are disadvised. | 0.2 |
| <b>hexPolygonUseDots</b>([<i>boolean</i>, <i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function, attribute or a boolean constant for whether to represent each polygon point as a circular dot instead of an hexagon. | `false` |
| <b>hexPolygonCurvatureResolution</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function, attribute or a numeric constant for the resolution (in angular degrees) of each hexed polygon surface curvature. The finer the resolution, the more the polygon hexes are fragmented into smaller faces to approximate the spheric surface, at the cost of performance. | 5 |
| <b>hexPolygonDotResolution</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Hexed polygon object accessor function, attribute or a numeric constant for the resolution of each circular dot, expressed in how many slice segments to divide the circumference. Higher values yield smoother circles, at the cost of performance. This is only applicable in dot representation mode. | 12 |
| <b>hexPolygonsTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate hexed polygons altitude and margin changes. A value of `0` will move the hexagons immediately to their final state. New hexed polygons are animated by sizing each hexagon from `0` radius. | 0 |

### Tiles Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>tilesData</b>([<i>array</i>]) | Getter/setter for the list of tiles to represent in the tiles map layer. Each tile is displayed as a spherical surface segment. The segments can be placed side-by-side for a tiled surface and each can be styled separately. | `[]` |
| <b>tileLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a numeric constant for the segment's centroid latitude coordinate. | `lat` |
| <b>tileLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a numeric constant for the segment's centroid longitude coordinate. | `lng` |
| <b>tileAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a numeric constant for the segment's altitude in terms of globe radius units. | 0.01 |
| <b>tileWidth</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a numeric constant for the segment's longitudinal width, in angular degrees. | 1 |
| <b>tileHeight</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a numeric constant for the segment's latitudinal height, in angular degrees. | 1 |
| <b>tileUseGlobeProjection</b>([<i>boolean</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a boolean constant for whether to use the globe's projection to shape the segment to its relative tiled position (`true`), or break free from this projection and shape the segment as if it would be laying directly on the equatorial perimeter (`false`). | `true` |
| <b>tileMaterial</b>([<i>material</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or material object for the [ThreeJS material](https://threejs.org/docs/#api/en/materials/Material) used to style the segment's surface. | `() => new MeshLambertMaterial({ color: '#ffbb88' })` |
| <b>tileCurvatureResolution</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Tile object accessor function, attribute or a numeric constant for the resolution (in angular degrees) of the surface curvature. The finer the resolution, the more the tile geometry is fragmented into smaller faces to approximate the spheric surface, at the cost of performance. | 5 |
| <b>tilesTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate tile changes involving geometry modifications. A value of `0` will move the tiles immediately to their final position. New tiles are animated by scaling them from the centroid outwards. | 1000 |

### Rings Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>ringsData</b>([<i>array</i>]) | Getter/setter for the list of self-propagating ripple rings to represent in the rings map layer. Each data point is displayed as an animated set of concentric circles that propagate outwards from (or inwards to) a central point through the spherical surface. | `[]` |
| <b>ringLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Ring object accessor function, attribute or a numeric constant for each circle's center latitude coordinate. | `lat` |
| <b>ringLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Ring object accessor function, attribute or a numeric constant for each circle's center longitude coordinate. | `lng` |
| <b>ringAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Ring object accessor function, attribute or a numeric constant for the circle's altitude in terms of globe radius units. | 0.0015 |
| <b>ringColor</b>([<i>str</i>, <i>[str, ...]</i> or <i>fn</i>]) | Ring object accessor function or attribute for the stroke color of each ring. Also supports radial color gradients by passing an array of colors, or a color interpolator function. | `() => '#ffffaa'` |
| <b>ringResolution</b>([<i>num</i>]) | Getter/setter for the geometric resolution of each circle, expressed in how many slice segments to divide the circumference. Higher values yield smoother circles. | 64 |
| <b>ringMaxRadius</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Ring object accessor function, attribute or a numeric constant for the maximum outer radius of the circles, at which the rings stop propagating and are removed. Defined in angular degrees. | 2 |
| <b>ringPropagationSpeed</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Ring object accessor function, attribute or a numeric constant for the propagation velocity of the rings, defined in degrees/second. Setting a negative value will invert the direction and cause the rings to propagate inwards from the `maxRadius`. | 1 |
| <b>ringRepeatPeriod</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Ring object accessor function, attribute or a numeric constant for the interval of time (in ms) to wait between consecutive auto-generated concentric circles. A value less or equal than `0` will disable the repetition and emit a single ring. | 700 |

### Labels Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>labelsData</b>([<i>array</i>]) | Getter/setter for the list of label objects to represent in the labels map layer. | `[]` |
| <b>labelLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a numeric constant for the latitude coordinate. | `lat` |
| <b>labelLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a numeric constant for the longitude coordinate. | `lng` |
| <b>labelText</b>([<i>str</i> or <i>fn</i>]) | Label object accessor function or attribute for the label text. | `text` |
| <b>labelColor</b>([<i>str</i> or <i>fn</i>]) | Label object accessor function or attribute for the label color. | `() => 'lightgrey'` |
| <b>labelAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a numeric constant for the label altitude in terms of globe radius units. | 0 |
| <b>labelSize</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a numeric constant for the label text height, in angular degrees. | 0.5 |
| <b>labelTypeFace</b>([<i>typeface </i>]) | Getter/setter for the text font typeface JSON object. Supports any typeface font generated by [Facetype.js](http://gero3.github.io/facetype.js/). | [helvetiker regular](https://github.com/mrdoob/three.js/blob/dev/examples/fonts/helvetiker_regular.typeface.json) |
| <b>labelRotation</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a numeric constant for the label rotation in degrees. The rotation is performed clockwise along the axis of its latitude parallel plane. | 0 |
| <b>labelResolution</b>([<i>num</i>]) | Getter/setter for the text geometric resolution of each label, expressed in how many segments to use in the text curves. Higher values yield smoother labels. | 3 |
| <b>labelIncludeDot</b>([<i>boolean</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a boolean constant for whether to include a dot marker next to the text indicating the exact `lat`, `lng` coordinates of the label. If enabled the text will be rendered offset from the dot. | `true` |
| <b>labelDotRadius</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Label object accessor function, attribute or a numeric constant for the radius of the dot marker, in angular degrees. | 0.1 |
| <b>labelDotOrientation</b>([<i>str</i> or <i>fn</i>]) | Label object accessor function or attribute for the orientation of the label if the dot marker is present. Possible values are `right`, `top` and `bottom`. | `() => 'bottom'` |
| <b>labelsTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate label changes involving position modifications (`lat`, `lng`, `altitude`, `rotation`). A value of `0` will move the labels immediately to their final position. New labels are animated by scaling their size. | 1000 |

### HTML Elements Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>htmlElementsData</b>([<i>array</i>]) | Getter/setter for the list of objects to represent in the HTML elements map layer. Each HTML element is rendered using [ThreeJS CSS2DRenderer](https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer). | `[]` |
| <b>htmlLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | HTML element accessor function, attribute or a numeric constant for the latitude coordinate of the element's central position. | `lat` |
| <b>htmlLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | HTML element accessor function, attribute or a numeric constant for the longitude coordinate of the element's central position. | `lng` |
| <b>htmlAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | HTML element accessor function, attribute or a numeric constant for the altitude coordinate of the element's position, in terms of globe radius units. | 0 |
| <b>htmlElement</b>([<i>str</i> or <i>fn</i>]) | Accessor function or attribute to retrieve the DOM element to use. Should return an instance of [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). | `null` |
| <b>htmlTransitionDuration</b>([<i>num</i>]) | Getter/setter for duration (ms) of the transition to animate HTML elements position changes. A value of `0` will move the elements immediately to their final position. | 1000 |

### 3D Objects Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>objectsData</b>([<i>array</i>]) | Getter/setter for the list of custom 3D objects to represent in the objects layer. Each object is rendered according to the `objectThreeObject` method. | `[]` |
| <b>objectLat</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Object accessor function, attribute or a numeric constant for the latitude coordinate of the object's position. | `lat` |
| <b>objectLng</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Object accessor function, attribute or a numeric constant for the longitude coordinate of the object's position. | `lng` |
| <b>objectAltitude</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Object accessor function, attribute or a numeric constant for the altitude coordinate of the object's position, in terms of globe radius units. | 0.01 |
| <b>objectRotation</b>([<i>{[x], [y], [z]}</i>, <i>str</i> or <i>fn</i>]) | Object accessor function, attribute or a `{x, y, z}` object for the object's rotation (in degrees). Each dimension is optional, allowing for rotation only in some axes. Rotation is applied in the order **X**->**Y**->**Z**. | - |
| <b>objectFacesSurface</b>([<i>boolean</i>, <i>str</i> or <i>fn</i>]) | Object accessor function, attribute or a boolean constant for whether the object should be rotated to face (away from) the globe surface (`true`), or be left in its original universe orientation (`false`). | `true` |
| <b>objectThreeObject</b>([<i>Object3d</i>, <i>str</i> or <i>fn</i>]) | Object accessor function or attribute for defining a custom 3d object to render as part of the objects map layer. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). | A yellow sphere |

### Custom Layer

| Method | Description | Default |
| --- | --- | :--: |
| <b>customLayerData</b>([<i>array</i>]) | Getter/setter for the list of items to represent in the custom map layer. Each item is rendered according to the `customThreeObject` method. | `[]` |
| <b>customThreeObject</b>([<i>Object3d</i>, <i>str</i> or <i>fn</i>]) | Object accessor function or attribute for generating a custom 3d object to render as part of the custom map layer. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). | `null` |
| <b>customThreeObjectUpdate</b>([<i>str</i> or <i>fn</i>]) | Object accessor function or attribute for updating an existing custom 3d object with new data. This can be used for performance improvement on data updates as the objects don't need to be removed and recreated at each update. The callback method's signature includes the object to be update and its new data: `customThreeObjectUpdate((obj, objData) => { ... })`. | `null` |

### Utility

| Method | Description |
| --- | --- |
| <b>getGlobeRadius</b>() | Returns the cartesian distance of a globe radius in absolute spatial units. ||
| <b>getCoords</b>(<i>lat</i>, <i>lng</i> [,<i>altitude</i>]) | Utility method to translate spherical coordinates. Given a pair of latitude/longitude coordinates and optionally altitude (in terms of globe radius units), returns the equivalent `{x, y, z}` cartesian spatial coordinates. ||
| <b>toGeoCoords</b>({ <i>x</i>, <i>y</i>, <i>z</i> }) | Utility method to translate cartesian coordinates to the geographic domain. Given a set of 3D cartesian coordinates `{x, y, z}`, returns the equivalent `{lat, lng, altitude}` spherical coordinates. Altitude is defined in terms of globe radius units. ||

### Render Options
| Method | Description | Default |
| --- | --- | :--: |
| <b>rendererSize</b>(<i>Vector2</i>) | It's recommended to inject the current [renderer size](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.getSize) to ensure the object proportions remain constant. This is specially necessary when using path FatLines. | Fallback to the full browser window size (`THREE.Vector2(window.innerWidth, window.innerHeight)`) |
| <b>pauseAnimation</b>() | Pauses the animation on all globe layers. | |
| <b>resumeAnimation</b>() | Resumes the animation on all globe layers. | |


## Giving Back

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url) If this project has helped you and you'd like to contribute back, you can always [buy me a ☕](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url)!

[npm-img]: https://img.shields.io/npm/v/three-globe
[npm-url]: https://npmjs.org/package/three-globe
[build-size-img]: https://img.shields.io/bundlephobia/minzip/three-globe
[build-size-url]: https://bundlephobia.com/result?p=three-globe
[npm-downloads-img]: https://img.shields.io/npm/dt/three-globe
[npm-downloads-url]: https://www.npmtrends.com/three-globe
