import Papa from "papaparse";
import { kml } from "@tmcw/togeojson";
import shp from "shpjs";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { PlanetBody } from "@/data/nasaSources";

export type GISLayer = {
  id: string;
  name: string;
  fileName: string;
  body: PlanetBody;
  visible: boolean;
  data: FeatureCollection;
  featureCount: number;
  geometryCounts: Record<string, number>;
  vertexCount: number;
  bounds: [number, number, number, number] | null;
  samplePoint: { latitude: number; longitude: number } | null;
  note: string;
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FEATURES = 20_000;
const MAX_VERTICES = 500_000;
const allowedGeometryTypes = new Set(["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"]);

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function coordinatesFromGeometry(geometry: Geometry | null): Position[] {
  if (!geometry) return [];
  const output: Position[] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      output.push(value as Position);
      return;
    }
    value.forEach(visit);
  };
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((child) => output.push(...coordinatesFromGeometry(child)));
  } else {
    visit(geometry.coordinates);
  }
  return output;
}

function validatePosition(position: Position) {
  const [longitude, latitude] = position;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new Error("Coordinates must be finite longitude/latitude values in the range −180..180 / −90..90.");
  }
}

function normalizeGeoJSON(value: unknown): FeatureCollection {
  if (!isObject(value) || typeof value.type !== "string") throw new Error("The file does not contain valid GeoJSON.");
  if (value.crs && JSON.stringify(value.crs).toUpperCase().includes("EPSG:3857")) {
    throw new Error("Reproject this file to WGS84 / EPSG:4326 before import.");
  }

  let collection: FeatureCollection;
  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    collection = value as unknown as FeatureCollection;
  } else if (value.type === "Feature") {
    collection = { type: "FeatureCollection", features: [value as unknown as Feature] };
  } else if (allowedGeometryTypes.has(value.type)) {
    collection = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: value as unknown as Geometry }] };
  } else {
    throw new Error("Import GeoJSON Feature, FeatureCollection, or a supported geometry. TopoJSON is not supported.");
  }

  if (collection.features.length === 0) throw new Error("The GIS file contains no features.");
  if (collection.features.length > MAX_FEATURES) throw new Error(`The file exceeds the ${MAX_FEATURES.toLocaleString()} feature limit.`);
  let totalVertices = 0;
  for (const feature of collection.features) {
    if (!feature || feature.type !== "Feature" || !feature.geometry || !allowedGeometryTypes.has(feature.geometry.type)) {
      throw new Error("A feature has missing or unsupported geometry.");
    }
    const positions = coordinatesFromGeometry(feature.geometry);
    totalVertices += positions.length;
    if (totalVertices > MAX_VERTICES) throw new Error(`The file exceeds the ${MAX_VERTICES.toLocaleString()} coordinate-vertex safety limit.`);
    for (const position of positions) validatePosition(position);
  }
  return collection;
}

function csvToFeatureCollection(text: string): FeatureCollection {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim() });
  if (parsed.errors.length) throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  const headers = parsed.meta.fields ?? [];
  const findColumn = (patterns: RegExp[]) => headers.find((header) => patterns.some((pattern) => pattern.test(header.trim().toLowerCase())));
  const latKey = findColumn([/^lat$/, /^latitude$/, /^y$/]);
  const lonKey = findColumn([/^lon$/, /^lng$/, /^long$/, /^longitude$/, /^x$/]);
  if (!latKey || !lonKey) throw new Error("CSV needs latitude and longitude columns (lat/lon, latitude/longitude, or y/x).");

  const features: Feature[] = [];
  for (const row of parsed.data) {
    const latitude = Number(row[latKey]);
    const longitude = Number(row[lonKey]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    validatePosition([longitude, latitude]);
    const properties = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? ""]));
    features.push({ type: "Feature", properties, geometry: { type: "Point", coordinates: [longitude, latitude] } });
  }
  return normalizeGeoJSON({ type: "FeatureCollection", features });
}

function mergeCollections(value: unknown): FeatureCollection {
  if (Array.isArray(value)) {
    const features = value.flatMap((item) => normalizeGeoJSON(item).features);
    return normalizeGeoJSON({ type: "FeatureCollection", features });
  }
  return normalizeGeoJSON(value);
}

function summarize(collection: FeatureCollection) {
  const geometryCounts: Record<string, number> = {};
  let vertexCount = 0;
  let minLongitude = Infinity;
  let minLatitude = Infinity;
  let maxLongitude = -Infinity;
  let maxLatitude = -Infinity;
  for (const feature of collection.features) {
    const type = feature.geometry?.type ?? "Unknown";
    geometryCounts[type] = (geometryCounts[type] ?? 0) + 1;
    const positions = coordinatesFromGeometry(feature.geometry);
    vertexCount += positions.length;
    for (const position of positions) {
      minLongitude = Math.min(minLongitude, position[0]);
      minLatitude = Math.min(minLatitude, position[1]);
      maxLongitude = Math.max(maxLongitude, position[0]);
      maxLatitude = Math.max(maxLatitude, position[1]);
    }
  }
  if (vertexCount === 0) return { geometryCounts, vertexCount, bounds: null as [number, number, number, number] | null };
  return {
    geometryCounts,
    vertexCount,
    bounds: [minLongitude, minLatitude, maxLongitude, maxLatitude] as [number, number, number, number],
  };
}

export function representativePoint(feature: Feature): { latitude: number; longitude: number } | null {
  const positions = coordinatesFromGeometry(feature.geometry);
  if (positions.length === 0) return null;
  const latitude = positions.reduce((sum, position) => sum + position[1], 0) / positions.length;
  const sinLongitude = positions.reduce((sum, position) => sum + Math.sin((position[0] * Math.PI) / 180), 0);
  const cosLongitude = positions.reduce((sum, position) => sum + Math.cos((position[0] * Math.PI) / 180), 0);
  const longitude = (Math.atan2(sinLongitude, cosLongitude) * 180) / Math.PI;
  return { latitude, longitude };
}

export async function parseGISFile(file: File, body: PlanetBody): Promise<GISLayer> {
  if (file.size > MAX_FILE_BYTES) throw new Error("GIS file must be 25 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  let collection: FeatureCollection;
  let note = "Coordinates are treated as longitude/latitude degrees. Verify the layer's CRS before analysis.";

  if (extension === "geojson" || extension === "json") {
    collection = normalizeGeoJSON(JSON.parse(await file.text()) as unknown);
  } else if (extension === "csv") {
    collection = csvToFeatureCollection(await file.text());
    note = "CSV points were mapped from the detected latitude/longitude columns.";
  } else if (extension === "kml") {
    const document = new DOMParser().parseFromString(await file.text(), "application/xml");
    if (document.querySelector("parsererror")) throw new Error("The KML XML could not be parsed.");
    collection = normalizeGeoJSON(kml(document));
    note = "KML coordinates are interpreted as WGS84 longitude/latitude.";
  } else if (extension === "zip") {
    const parsed = await shp(await file.arrayBuffer());
    collection = mergeCollections(parsed);
    note = "Shapefile ZIP loaded; confirm its projection file and coordinate convention before interpreting positions.";
  } else {
    throw new Error("Supported formats: GeoJSON, JSON, CSV, KML, and Shapefile ZIP.");
  }

  const id = globalThis.crypto?.randomUUID?.() ?? `gis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const data: FeatureCollection = {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      ...feature,
      properties: { ...(feature.properties ?? {}), __terranovaLayerId: id },
    })),
  };
  const summary = summarize(data);
  const samplePoint = representativePoint(data.features[0]);
  return {
    id,
    name: file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    body,
    visible: true,
    data,
    featureCount: data.features.length,
    geometryCounts: summary.geometryCounts,
    vertexCount: summary.vertexCount,
    bounds: summary.bounds,
    samplePoint,
    note,
  };
}

export function gisCentroidMarkers(layers: GISLayer[], body: PlanetBody) {
  const markers: { id: string; latitude: number; longitude: number; name: string }[] = [];
  for (const layer of layers) {
    if (layer.body !== body || !layer.visible) continue;
    for (const [index, feature] of layer.data.features.entries()) {
      const point = representativePoint(feature);
      if (!point) continue;
      const properties = feature.properties as Record<string, unknown> | null;
      const propertyName = properties ? Object.entries(properties).find(([key, value]) => key !== "__terranovaLayerId" && typeof value === "string" && value.trim())?.[1] : null;
      markers.push({
        id: `${layer.id}-${index}`,
        latitude: point.latitude,
        longitude: point.longitude,
        name: typeof propertyName === "string" ? propertyName : `${layer.name} · ${index + 1}`,
      });
      if (markers.length >= 300) return markers;
    }
  }
  return markers;
}
