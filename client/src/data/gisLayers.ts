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

export function coordinatesFromGeometry(geometry: Geometry | null): Position[] {
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
    for (const child of geometry.geometries) {
      const childPositions = coordinatesFromGeometry(child);
      for (const position of childPositions) output.push(position);
    }
  } else {
    visit(geometry.coordinates);
  }
  return output;
}

export function representativePoint(feature: Feature): { latitude: number; longitude: number } | null {
  const positions = coordinatesFromGeometry(feature.geometry);
  if (positions.length === 0) return null;
  let latitudeSum = 0;
  let sinLongitude = 0;
  let cosLongitude = 0;
  for (const position of positions) {
    latitudeSum += position[1];
    const radians = (position[0] * Math.PI) / 180;
    sinLongitude += Math.sin(radians);
    cosLongitude += Math.cos(radians);
  }
  return {
    latitude: latitudeSum / positions.length,
    longitude: (Math.atan2(sinLongitude, cosLongitude) * 180) / Math.PI,
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
