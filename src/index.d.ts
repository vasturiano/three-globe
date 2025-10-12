import { Object3D, Vector2, Material, Camera, Texture } from 'three';

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type ObjAccessor<T> = Accessor<object, T>;

type HexBinAccessor<T> = Accessor<{ points: object[], sumWeight: number, center: { lat: number, lng: number }}, T>;

interface GeoJsonGeometry {
  type: string;
  coordinates: number[];
}

interface TypeFace {}

type LabelOrientation = 'right' | 'top' | 'bottom';

interface Rotation {
  x?: number;
  y?: number;
  z?: number;
}

export interface ConfigOptions {
  waitForGlobeReady?: boolean;
  animateIn?: boolean;
}

export declare class ThreeGlobeGeneric<ChainableInstance> extends Object3D {
  constructor(configOptions?: ConfigOptions);

  // Globe layer
  globeImageUrl(): string | null;
  globeImageUrl(url: string): ChainableInstance;
  bumpImageUrl(): string | null;
  bumpImageUrl(url: string): ChainableInstance;
  showGlobe(): boolean;
  showGlobe(show: boolean): ChainableInstance;
  showGraticules(): boolean;
  showGraticules(show: boolean): ChainableInstance;
  showAtmosphere(): boolean;
  showAtmosphere(show: boolean): ChainableInstance;
  atmosphereColor(): string;
  atmosphereColor(color: string): ChainableInstance;
  atmosphereAltitude(): number;
  atmosphereAltitude(alt: number): ChainableInstance;
  atmosphereIntensity(): number;
  atmosphereIntensity(alt: number): ChainableInstance;
  atmosphereDispersion(): number;
  atmosphereDispersion(alt: number): ChainableInstance;
  atmosphereLightDirection(): number[];
  atmosphereLightDirection(alt: number[]): ChainableInstance;
  atmosphereDensity(): number;
  atmosphereDensity(alt: number): ChainableInstance;
  globeCurvatureResolution(): number;
  globeCurvatureResolution(res: number): ChainableInstance;
  globeTileEngineUrl(): (x: number, y: number, level: number) => string;
  globeTileEngineUrl(urlFn: (x: number, y: number, level: number) => string): ChainableInstance;
  globeTileEngineMaxLevel(): number;
  globeTileEngineMaxLevel(level: number): ChainableInstance;
  globeMaterial(): Material;
  globeMaterial(globeMaterial: Material): ChainableInstance;
  onGlobeReady(callback: (() => void)): ChainableInstance;

  // Points layer
  pointsData(): object[];
  pointsData(data: object[]): ChainableInstance;
  pointLat(): ObjAccessor<number>;
  pointLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  pointLng(): ObjAccessor<number>;
  pointLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  pointColor(): ObjAccessor<string>;
  pointColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
  pointAltitude(): ObjAccessor<number>;
  pointAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  pointRadius(): ObjAccessor<number>;
  pointRadius(radiusAccessor: ObjAccessor<number>): ChainableInstance;
  pointResolution(): number;
  pointResolution(resolution: number): ChainableInstance;
  pointsMerge(): boolean;
  pointsMerge(merge: boolean): ChainableInstance;
  pointsTransitionDuration(): number;
  pointsTransitionDuration(durationMs: number): ChainableInstance;

  // Arcs layer
  arcsData(): object[];
  arcsData(data: object[]): ChainableInstance;
  arcStartLat(): ObjAccessor<number>;
  arcStartLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  arcEndLat(): ObjAccessor<number>;
  arcEndLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  arcStartLng(): ObjAccessor<number>;
  arcStartLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  arcEndLng(): ObjAccessor<number>;
  arcEndLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  arcStartAltitude(): ObjAccessor<number>;
  arcStartAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  arcEndAltitude(): ObjAccessor<number>;
  arcEndAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  arcColor(): ObjAccessor<string | string[] | ((t: number) => string)>;
  arcColor(colorsAccessor: ObjAccessor<string | string[] | ((t: number) => string)>): ChainableInstance;
  arcAltitude(): ObjAccessor<number | null>;
  arcAltitude(altitudeAccessor: ObjAccessor<number| null>): ChainableInstance;
  arcAltitudeAutoScale(): ObjAccessor<number>;
  arcAltitudeAutoScale(scaleAccessor: ObjAccessor<number>): ChainableInstance;
  arcStroke(): ObjAccessor<number | null>;
  arcStroke(strokeWidthAccessor: ObjAccessor<number | null>): ChainableInstance;
  arcCurveResolution(): number;
  arcCurveResolution(resolution: number): ChainableInstance;
  arcCircularResolution(): number;
  arcCircularResolution(resolution: number): ChainableInstance;
  arcDashLength(): ObjAccessor<number>;
  arcDashLength(dashLengthAccessor: ObjAccessor<number>): ChainableInstance;
  arcDashGap(): ObjAccessor<number>;
  arcDashGap(dashGapAccessor: ObjAccessor<number>): ChainableInstance;
  arcDashInitialGap(): ObjAccessor<number>;
  arcDashInitialGap(dashGapAccessor: ObjAccessor<number>): ChainableInstance;
  arcDashAnimateTime(): ObjAccessor<number>;
  arcDashAnimateTime(durationMsAccessor: ObjAccessor<number>): ChainableInstance;
  arcsTransitionDuration(): number;
  arcsTransitionDuration(durationMs: number): ChainableInstance;

  // Polygons layer
  polygonsData(): object[];
  polygonsData(data: object[]): ChainableInstance;
  polygonGeoJsonGeometry(): ObjAccessor<GeoJsonGeometry>;
  polygonGeoJsonGeometry(geometryAccessor: ObjAccessor<GeoJsonGeometry>): ChainableInstance;
  polygonCapColor(): ObjAccessor<string>;
  polygonCapColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
  polygonCapMaterial(): ObjAccessor<Material>;
  polygonCapMaterial(materialAccessor: ObjAccessor<Material>): ChainableInstance;
  polygonSideColor(): ObjAccessor<string>;
  polygonSideColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
  polygonSideMaterial(): ObjAccessor<Material>;
  polygonSideMaterial(materialAccessor: ObjAccessor<Material>): ChainableInstance;
  polygonStrokeColor(): ObjAccessor<string | boolean | null>;
  polygonStrokeColor(colorAccessor: ObjAccessor<string | boolean | null>): ChainableInstance;
  polygonAltitude(): ObjAccessor<number>;
  polygonAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  polygonCapCurvatureResolution(): ObjAccessor<number>;
  polygonCapCurvatureResolution(capCurvatureResolutionAccessor: ObjAccessor<number>): ChainableInstance;
  polygonsTransitionDuration(): number;
  polygonsTransitionDuration(durationMs: number): ChainableInstance;

  // Paths layer
  pathsData(): object[];
  pathsData(data: object[]): ChainableInstance;
  pathPoints(): ObjAccessor<any[]>;
  pathPoints(pointsAccessor: ObjAccessor<any[]>): ChainableInstance;
  pathPointLat(): Accessor<any, number>;
  pathPointLat(latitudeAccessor: Accessor<any, number>): ChainableInstance;
  pathPointLng(): Accessor<any, number>;
  pathPointLng(longitudeAccessor: Accessor<any, number>): ChainableInstance;
  pathPointAlt(): Accessor<any, number>;
  pathPointAlt(altitudeAccessor: Accessor<any, number>): ChainableInstance;
  pathResolution(): number;
  pathResolution(resolution: number): ChainableInstance;
  pathColor(): ObjAccessor<string | string[] | ((t: number) => string)>;
  pathColor(colorsAccessor: ObjAccessor<string | string[] | ((t: number) => string)>): ChainableInstance;
  pathStroke(): ObjAccessor<number | null>;
  pathStroke(widthAccessor: ObjAccessor<number | null>): ChainableInstance;
  pathDashLength(): ObjAccessor<number>;
  pathDashLength(dashLengthAccessor: ObjAccessor<number>): ChainableInstance;
  pathDashGap(): ObjAccessor<number>;
  pathDashGap(dashGapAccessor: ObjAccessor<number>): ChainableInstance;
  pathDashInitialGap(): ObjAccessor<number>;
  pathDashInitialGap(dashGapAccessor: ObjAccessor<number>): ChainableInstance;
  pathDashAnimateTime(): ObjAccessor<number>;
  pathDashAnimateTime(durationMsAccessor: ObjAccessor<number>): ChainableInstance;
  pathTransitionDuration(): number;
  pathTransitionDuration(durationMs: number): ChainableInstance;

  // Hex Bin layer
  hexBinPointsData(): object[];
  hexBinPointsData(data: object[]): ChainableInstance;
  hexBinPointLat(): ObjAccessor<number>;
  hexBinPointLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  hexBinPointLng(): ObjAccessor<number>;
  hexBinPointLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  hexBinPointWeight(): ObjAccessor<number>;
  hexBinPointWeight(weightAccessor: ObjAccessor<number>): ChainableInstance;
  hexBinResolution(): number;
  hexBinResolution(resolution: number): ChainableInstance;
  hexMargin(): HexBinAccessor<number>;
  hexMargin(margin: HexBinAccessor<number>): ChainableInstance;
  hexAltitude(): HexBinAccessor<number>;
  hexAltitude(altitude: HexBinAccessor<number>): ChainableInstance;
  hexTopCurvatureResolution(): number;
  hexTopCurvatureResolution(resolution: number): ChainableInstance;
  hexTopColor(): HexBinAccessor<string>;
  hexTopColor(colorAccessor: HexBinAccessor<string>): ChainableInstance;
  hexSideColor(): HexBinAccessor<string>;
  hexSideColor(colorAccessor: HexBinAccessor<string>): ChainableInstance;
  hexBinMerge(): boolean;
  hexBinMerge(merge: boolean): ChainableInstance;
  hexTransitionDuration(): number;
  hexTransitionDuration(durationMs: number): ChainableInstance;

  // Heatmaps layer
  heatmapsData(): object[];
  heatmapsData(data: object[]): ChainableInstance;
  heatmapPoints(): ObjAccessor<object[]>;
  heatmapPoints(pointsAccessor: ObjAccessor<object[]>): ChainableInstance;
  heatmapPointLat(): ObjAccessor<number>;
  heatmapPointLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapPointLng(): ObjAccessor<number>;
  heatmapPointLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapPointWeight(): ObjAccessor<number>;
  heatmapPointWeight(weightAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapBandwidth(): ObjAccessor<number>;
  heatmapBandwidth(bandwidthAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapColorFn(): ObjAccessor<(t: number) => string>;
  heatmapColorFn(colorFnAccessor: ObjAccessor<(t: number) => string>): ChainableInstance;
  heatmapColorSaturation(): ObjAccessor<number>;
  heatmapColorSaturation(saturationAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapBaseAltitude(): ObjAccessor<number>;
  heatmapBaseAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapTopAltitude(): ObjAccessor<number>;
  heatmapTopAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  heatmapsTransitionDuration(): number;
  heatmapsTransitionDuration(durationMs: number): ChainableInstance;

  // Hexed Polygons layer
  hexPolygonsData(): object[];
  hexPolygonsData(data: object[]): ChainableInstance;
  hexPolygonGeoJsonGeometry(): ObjAccessor<GeoJsonGeometry>;
  hexPolygonGeoJsonGeometry(geometryAccessor: ObjAccessor<GeoJsonGeometry>): ChainableInstance;
  hexPolygonColor(): ObjAccessor<string>;
  hexPolygonColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
  hexPolygonAltitude(): ObjAccessor<number>;
  hexPolygonAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  hexPolygonResolution(): ObjAccessor<number>;
  hexPolygonResolution(resolutionAccessor: ObjAccessor<number>): ChainableInstance;
  hexPolygonMargin(): ObjAccessor<number>;
  hexPolygonMargin(marginAccessor: ObjAccessor<number>): ChainableInstance;
  hexPolygonUseDots(): ObjAccessor<boolean>;
  hexPolygonUseDots(useDotsAccessor: ObjAccessor<boolean>): ChainableInstance;
  hexPolygonCurvatureResolution(): ObjAccessor<number>;
  hexPolygonCurvatureResolution(resolutionAccessor: ObjAccessor<number>): ChainableInstance;
  hexPolygonDotResolution(): ObjAccessor<number>;
  hexPolygonDotResolution(resolutionAccessor: ObjAccessor<number>): ChainableInstance;
  hexPolygonsTransitionDuration(): number;
  hexPolygonsTransitionDuration(durationMs: number): ChainableInstance;

  // Tiles layer
  tilesData(): object[];
  tilesData(data: object[]): ChainableInstance;
  tileLat(): ObjAccessor<number>;
  tileLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  tileLng(): ObjAccessor<number>;
  tileLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  tileAltitude(): ObjAccessor<number>;
  tileAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  tileWidth(): ObjAccessor<number>;
  tileWidth(widthAccessor: ObjAccessor<number>): ChainableInstance;
  tileHeight(): ObjAccessor<number>;
  tileHeight(heightAccessor: ObjAccessor<number>): ChainableInstance;
  tileUseGlobeProjection(): boolean;
  tileUseGlobeProjection(useGlobeProjection: boolean): ChainableInstance;
  tileMaterial(): ObjAccessor<Material>;
  tileMaterial(materialAccessor: ObjAccessor<Material>): ChainableInstance;
  tileCurvatureResolution(): ObjAccessor<number>;
  tileCurvatureResolution(curvatureResolutionAccessor: ObjAccessor<number>): ChainableInstance;
  tilesTransitionDuration(): number;
  tilesTransitionDuration(durationMs: number): ChainableInstance;

  // Particles Layer
  particlesData(): object[];
  particlesData(data: object[]): ChainableInstance;
  particlesList(): ObjAccessor<object[]>;
  particlesList(listAccessor: ObjAccessor<object[]>): ChainableInstance;
  particleLat(): ObjAccessor<number>;
  particleLat(latAccessor: ObjAccessor<number>): ChainableInstance;
  particleLng(): ObjAccessor<number>;
  particleLng(lngAccessor: ObjAccessor<number>): ChainableInstance;
  particleAltitude(): ObjAccessor<number>;
  particleAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  particlesSize(): ObjAccessor<number>;
  particlesSize(sizeAccessor: ObjAccessor<number>): ChainableInstance;
  particlesSizeAttenuation(): ObjAccessor<boolean>;
  particlesSizeAttenuation(sizeAttenuationAccessor: ObjAccessor<boolean>): ChainableInstance;
  particlesColor(): ObjAccessor<string>;
  particlesColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
  particlesTexture(): ObjAccessor<Texture>;
  particlesTexture(textureAccessor: ObjAccessor<Texture>): ChainableInstance;

  // Rings Layer
  ringsData(): object[];
  ringsData(data: object[]): ChainableInstance;
  ringLat(): ObjAccessor<number>;
  ringLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  ringLng(): ObjAccessor<number>;
  ringLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  ringAltitude(): ObjAccessor<number>;
  ringAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  ringColor(): ObjAccessor<string | string[] | ((t: number) => string)>;
  ringColor(colorAccessor: ObjAccessor<string | string[] | ((t: number) => string)>): ChainableInstance;
  ringResolution(): number;
  ringResolution(resolution: number): ChainableInstance;
  ringMaxRadius(): ObjAccessor<number>;
  ringMaxRadius(radiusAccessor: ObjAccessor<number>): ChainableInstance;
  ringPropagationSpeed(): ObjAccessor<number>;
  ringPropagationSpeed(speedAccessor: ObjAccessor<number>): ChainableInstance;
  ringRepeatPeriod(): ObjAccessor<number>;
  ringRepeatPeriod(msAccessor: ObjAccessor<number>): ChainableInstance;

  // Labels layer
  labelsData(): object[];
  labelsData(data: object[]): ChainableInstance;
  labelLat(): ObjAccessor<number>;
  labelLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  labelLng(): ObjAccessor<number>;
  labelLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  labelText(): ObjAccessor<string>;
  labelText(textAccessor: ObjAccessor<string>): ChainableInstance;
  labelColor(): ObjAccessor<string>;
  labelColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
  labelAltitude(): ObjAccessor<number>;
  labelAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  labelSize(): ObjAccessor<number>;
  labelSize(sizeAccessor: ObjAccessor<number>): ChainableInstance;
  labelTypeFace(): TypeFace;
  labelTypeFace(typeface: TypeFace): ChainableInstance;
  labelRotation(): ObjAccessor<number>;
  labelRotation(rotationAccessor: ObjAccessor<number>): ChainableInstance;
  labelResolution(): number;
  labelResolution(resolution: number): ChainableInstance;
  labelIncludeDot(): ObjAccessor<boolean>;
  labelIncludeDot(includeAccessor: ObjAccessor<boolean>): ChainableInstance;
  labelDotRadius(): ObjAccessor<number>;
  labelDotRadius(radiusAccessor: ObjAccessor<number>): ChainableInstance;
  labelDotOrientation(): ObjAccessor<LabelOrientation>;
  labelDotOrientation(orientationAccessor: ObjAccessor<LabelOrientation>): ChainableInstance;
  labelsTransitionDuration(): number;
  labelsTransitionDuration(durationMs: number): ChainableInstance;

  // HTML Elements layer
  htmlElementsData(): object[];
  htmlElementsData(data: object[]): ChainableInstance;
  htmlLat(): ObjAccessor<number>;
  htmlLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  htmlLng(): ObjAccessor<number>;
  htmlLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  htmlAltitude(): ObjAccessor<number>;
  htmlAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  htmlElement(): HTMLElement | string | ((d: object) => HTMLElement);
  htmlElement(htmlElementAccessor: HTMLElement | string | ((d: object) => HTMLElement)): ChainableInstance;
  htmlElementVisibilityModifier(): (el: HTMLElement, isVisible: boolean) => void;
  htmlElementVisibilityModifier(modifierFn: (el: HTMLElement, isVisible: boolean) => void): ChainableInstance;
  htmlTransitionDuration(): number;
  htmlTransitionDuration(durationMs: number): ChainableInstance;

  // Objects layer
  objectsData(): object[];
  objectsData(data: object[]): ChainableInstance;
  objectLat(): ObjAccessor<number>;
  objectLat(latitudeAccessor: ObjAccessor<number>): ChainableInstance;
  objectLng(): ObjAccessor<number>;
  objectLng(longitudeAccessor: ObjAccessor<number>): ChainableInstance;
  objectAltitude(): ObjAccessor<number>;
  objectAltitude(altitudeAccessor: ObjAccessor<number>): ChainableInstance;
  objectRotation(): ObjAccessor<Rotation>
  objectRotation(rotationAccessor: ObjAccessor<Rotation>): ChainableInstance;
  objectFacesSurface(): ObjAccessor<boolean>;
  objectFacesSurface(facesSurfaceAccessor: ObjAccessor<boolean>): ChainableInstance;
  objectThreeObject(): Object3D | string | ((d: object) => Object3D);
  objectThreeObject(object3DAccessor: Object3D | string | ((d: object) => Object3D)): ChainableInstance;

  // Custom layer
  customLayerData(): object[];
  customLayerData(data: object[]): ChainableInstance;
  customThreeObject(): Object3D | string | ((d: object) => Object3D);
  customThreeObject(object3DAccessor: Object3D | string | ((d: object) => Object3D)): ChainableInstance;
  customThreeObjectUpdate(): string | ((obj: Object3D, objData: object) => void);
  customThreeObjectUpdate(object3dAccessor: string | ((obj: Object3D, objData: object) => void)): ChainableInstance;

  // Utility
  getGlobeRadius(): number;
  getCoords(lat: number, lng: number, altitude?: number): { x: number, y: number, z: number };
  toGeoCoords(coords: { x: number, y: number, z: number }): { lat: number, lng: number, altitude: number };

  // Render options
  rendererSize(): Vector2;
  rendererSize(size: Vector2): ChainableInstance;
  setPointOfView(camera: Camera): void;
  pauseAnimation(): ChainableInstance;
  resumeAnimation(): ChainableInstance;
  _destructor(): void;
}

declare class ThreeGlobe extends ThreeGlobeGeneric<ThreeGlobe> {}

export default ThreeGlobe;
