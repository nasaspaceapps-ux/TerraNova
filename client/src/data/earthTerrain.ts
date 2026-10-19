import type { AnalogTargetBody } from "@/data/analogScore";

export const ASTER_POINT_API = "https://api.opentopodata.org/v1/aster30m";
export const ASTER_DATASET_URL = "https://www.opentopodata.org/datasets/aster/";
export const ASTER_NASA_SOURCE_URL = "https://www.earthdata.nasa.gov/data/catalog/lpcloud-astgtm-003";

export type EarthTerrainWindow = {
  medianSlopeDeg: number;
  reliefP90P10M: number | null;
  supportWidthKm: number;
  elevationSamplesM: number[];
  slopeSamplesDeg: number[];
  samplesUsed: number;
  samplesExpected: 9;
  dataset: string;
  source: "ASTER GDEM V003 via OpenTopoData";
};

type TopoResult = { elevation: number | null; dataset?: string };
type TopoPayload = { results?: TopoResult[] };

const requestCache = new Map<string, Promise<EarthTerrainWindow>>();
const earthRadiusM = 6_371_008.8;
const arcSecondDeg = 1 / 3600;

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function quantile(values: number[], q: number) {
  const ordered = [...values].sort((a, b) => a - b);
  if (ordered.length === 1) return ordered[0];
  const position = (ordered.length - 1) * q;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return ordered[lower] + (ordered[Math.min(lower + 1, ordered.length - 1)] - ordered[lower]) * fraction;
}

function calculateSlopeDeg(north: number, south: number, east: number, west: number, latitude: number) {
  const latDeltaRad = (2 * arcSecondDeg * Math.PI) / 180;
  const lonDeltaRad = (2 * arcSecondDeg * Math.PI) / 180;
  const northSouthM = earthRadiusM * latDeltaRad;
  const eastWestM = earthRadiusM * Math.cos((latitude * Math.PI) / 180) * lonDeltaRad;
  if (Math.abs(eastWestM) < 0.1) throw new Error("ASTER slope sampling is unstable close to the pole.");
  const dzNorth = (north - south) / northSouthM;
  const dzEast = (east - west) / eastWestM;
  return (Math.atan(Math.hypot(dzNorth, dzEast)) * 180) / Math.PI;
}

export function fetchEarthTerrainWindow(
  latitude: number,
  longitude: number,
  body: AnalogTargetBody,
): Promise<EarthTerrainWindow> {
  if (!Number.isFinite(latitude) || latitude < -83 || latitude > 83) {
    return Promise.reject(new Error("ASTER GDEM coverage does not support this latitude (approximately 83°N–83°S)."));
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Promise.reject(new Error("Longitude must be between −180° and 180°."));
  }

  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)},${body}`;
  const cached = requestCache.get(key);
  if (cached) return cached;

  const supportWidthKm = body === "Moon" ? 5 : 11;
  const halfWidthKm = supportWidthKm / 2;
  const cosLat = Math.max(Math.cos((latitude * Math.PI) / 180), 0.12);
  const offsetLat = halfWidthKm / 111.195;
  const offsetLon = halfWidthKm / (111.195 * cosLat);
  const centers = [-1, 0, 1].flatMap((latIndex) => [-1, 0, 1].map((lonIndex) => ({
    lat: latitude + latIndex * offsetLat,
    lon: Math.max(-180, Math.min(180, longitude + lonIndex * offsetLon)),
  })));

  const samplePoints: { lat: number; lon: number }[] = [];
  for (const center of centers) {
    const localCosLat = Math.max(Math.cos((center.lat * Math.PI) / 180), 0.12);
    const localLonStep = arcSecondDeg / localCosLat;
    samplePoints.push(
      { lat: center.lat + arcSecondDeg, lon: center.lon },
      { lat: center.lat - arcSecondDeg, lon: center.lon },
      { lat: center.lat, lon: center.lon + localLonStep },
      { lat: center.lat, lon: center.lon - localLonStep },
      center,
    );
  }

  const url = new URL(ASTER_POINT_API);
  url.searchParams.set("locations", samplePoints.map((point) => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`).join("|"));
  url.searchParams.set("interpolation", "nearest");

  const request = fetch(url.toString(), { headers: { Accept: "application/json" } }).then(async (response) => {
    if (!response.ok) throw new Error(`ASTER point service returned HTTP ${response.status}.`);
    const payload = await response.json() as TopoPayload;
    const results = payload.results ?? [];
    if (results.length !== samplePoints.length) throw new Error("ASTER point service returned an incomplete sample set.");

    const slopeSamplesDeg: number[] = [];
    const elevationSamplesM: number[] = [];
    for (let index = 0; index < centers.length; index += 1) {
      const base = index * 5;
      const [north, south, east, west, center] = results.slice(base, base + 5);
      if ([north, south, east, west].some((item) => typeof item?.elevation !== "number" || !Number.isFinite(item.elevation))) continue;
      slopeSamplesDeg.push(calculateSlopeDeg(north.elevation!, south.elevation!, east.elevation!, west.elevation!, centers[index].lat));
      if (typeof center?.elevation === "number" && Number.isFinite(center.elevation)) elevationSamplesM.push(center.elevation);
    }

    if (slopeSamplesDeg.length < 3) throw new Error("ASTER returned too few valid neighbourhood samples to estimate regional slope.");
    const reliefP90P10M = elevationSamplesM.length >= 5
      ? quantile(elevationSamplesM, 0.9) - quantile(elevationSamplesM, 0.1)
      : null;
    return {
      medianSlopeDeg: median(slopeSamplesDeg),
      reliefP90P10M,
      supportWidthKm,
      elevationSamplesM,
      slopeSamplesDeg,
      samplesUsed: slopeSamplesDeg.length,
      samplesExpected: 9 as const,
      dataset: results.find((item) => item.dataset)?.dataset ?? "ASTER30m",
      source: "ASTER GDEM V003 via OpenTopoData" as const,
    };
  });

  requestCache.set(key, request);
  request.catch(() => requestCache.delete(key));
  return request;
}
