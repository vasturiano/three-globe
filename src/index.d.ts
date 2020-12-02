import { Object3D, Vector2, MeshPhongMaterial, Material } from 'three';

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type ObjAccessor<T> = Accessor<object, T>;

type HexBinAccessor<T> = Accessor<{ points: object[], sumWeight: number, center: { lat: number, lng: number }}, T>;

interface GeoJsonGeometry {
  type: string;
  coordinates: number[];
}

interface TypeFace {}

type LabelOrientation = 'right' | 'top' | 'bottom';

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
  showAtmosphere(): boolean;
  showAtmosphere(show: boolean): ChainableInstance;
  showGraticules(): boolean;
  showGraticules(show: boolean): ChainableInstance;
  globeMaterial(): MeshPhongMaterial;

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
  arcColor(): ObjAccessor<string | string[]>;
  arcColor(colorsAccessor: ObjAccessor<string | string[]>): ChainableInstance;
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
  polygonSideColor(): ObjAccessor<string>;
  polygonSideColor(colorAccessor: ObjAccessor<string>): ChainableInstance;
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
  pathColor(): ObjAccessor<string | string[]>;
  pathColor(colorsAccessor: ObjAccessor<string | string[]>): ChainableInstance;
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
  hexPolygonCurvatureResolution(): ObjAccessor<number>;
  hexPolygonCurvatureResolution(resolutionAccessor: ObjAccessor<number>): ChainableInstance;
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

  // Custom layer
  customLayerData(): object[];
  customLayerData(data: object[]): ChainableInstance;
  customThreeObject(): Object3D | string | ((d: object, globeRadius: number) => Object3D);
  customThreeObject(object3DAccessor: Object3D | string | ((d: object, globeRadius: number) => Object3D)): ChainableInstance;
  customThreeObjectUpdate(): string | ((obj: Object3D, objData: object, globeRadius: number) => void);
  customThreeObjectUpdate(object3dAccessor: string | ((obj: Object3D, objData: object, globeRadius: number) => void)): ChainableInstance;

  // Utility
  getCoords(lat: number, lng: number, altitude?: number): { x: number, y: number, z: number };
  toGeoCoords(coords: { x: number, y: number, z: number }): { lat: number, lng: number, altitude: number };

  // Render options
  rendererSize(): Vector2;
  rendererSize(size: Vector2): ChainableInstance;
}

declare class ThreeGlobe extends ThreeGlobeGeneric<ThreeGlobe> {}

export default ThreeGlobe;
