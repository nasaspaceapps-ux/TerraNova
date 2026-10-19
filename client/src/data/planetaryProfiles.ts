import type { Site } from "@/data/sites";

export type EarthTopographySample = {
  elevationM: number;
  slopeDeg: number;
  neighborsM: { north: number; south: number; east: number; west: number };
};

// Point samples at approximate map pins; ASTER GDEM V003 via OpenTopoData, nearest-neighbour.
// The local slope is a four-cardinal-neighbour finite-difference estimate over 1 arc-second offsets.
export const earthTopographyBySite: Record<string, EarthTopographySample> = {
  atacama: { elevationM: 2271, slopeDeg: 15.98, neighborsM: { north: 2280, south: 2267, east: 2277, west: 2266 } },
  haughton: { elevationM: 149, slopeDeg: 8.23, neighborsM: { north: 160, south: 152, east: 150, west: 151 } },
  "dry-valleys": { elevationM: 974, slopeDeg: 14.53, neighborsM: { north: 978, south: 962, east: 974, west: 974 } },
  "death-valley": { elevationM: -88, slopeDeg: 3.88, neighborsM: { north: -88, south: -92, east: -90, west: -89 } },
  namib: { elevationM: 722, slopeDeg: 8.56, neighborsM: { north: 723, south: 720, east: 726, west: 718 } },
  reykjanes: { elevationM: 205, slopeDeg: 23.63, neighborsM: { north: 191, south: 211, east: 208, west: 200 } },
  lanzarote: { elevationM: 244, slopeDeg: 4.87, neighborsM: { north: 245, south: 241, east: 247, west: 244 } },
  dhofar: { elevationM: 63, slopeDeg: 7.44, neighborsM: { north: 58, south: 66, east: 63, west: 64 } },
};

export const earthTopographyMetadata = {
  product: "ASTER Global Digital Elevation Model V003 (NASA/METI)",
  provider: "OpenTopoData public ASTER30m API; GDEM version 3; interpolation=nearest",
  resolution: "1 arc-second (~30 m posting at the equator)",
  horizontalReference: "WGS84",
  verticalReference: "EGM96 geoid",
  temporalExtent: "Input scenes acquired 2000-03 to 2013-11",
  retrieved: "2026-10-15",
  sourceUrl: "https://www.earthdata.nasa.gov/data/catalog/lpcloud-astgtm-003",
  providerUrl: "https://www.opentopodata.org/datasets/aster/",
} as const;

export const lunarSite04 = {
  label: "LOLA Site04 · lunar south-polar region",
  window: "Central 5 × 5 km window within the NASA Site04 16 × 16 km raster",
  resolution: "5 m/pixel",
  cellsSampled: 1_000_000,
  elevationP10M: -404.329,
  elevationMedianM: 829.882,
  elevationP90M: 1658.938,
  slopeP10Deg: 12.79,
  slopeMedianDeg: 30.484,
  slopeP90Deg: 34.974,
  referenceRadiusM: 1_737_400,
  interpolatedPercent: 90,
  medianRmsHeightErrorM: "0.30–0.50",
  medianRmsSlopeErrorDeg: "1.5–2.5",
  sourceUrl: "https://pgda.gsfc.nasa.gov/products/78",
} as const;

export const lunarDiviner = {
  variable: "Bolometric brightness temperature (Tbol)",
  statisticRadiusKm: 2.5,
  centerLatitude: -89.768266,
  centerLongitude: -172.14673,
  validRecords: 345,
  p10K: 62.76,
  medianK: 85.66,
  p90K: 148.57,
  observedMinK: 60.17,
  observedMaxK: 251.51,
  localTimeMinHours: 8.665,
  localTimeMedianHours: 10.042,
  localTimeMaxHours: 11.396,
  productBin: "240 m grid · LS330 · SLON15",
  period: "2009-07-05 to 2020-03-15",
  sourceUrl: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm",
} as const;

export const marsJezero = {
  label: "Jezero Crater · Perseverance reference area",
  latitude: 18.4447,
  longitudeEast: 77.4508,
  elevationM: -2609,
  localSlopeDeg: 0.671,
  resolution: "16 pixels/degree; 3.704 km/pixel at the equator (~3.5 km east-west here)",
  verticalReference: "Goddard Mars areoid; MOLA height = planetary radius minus areoid radius",
  localNeighborhood: "3 × 3 MOLA cells; central-difference slope estimate",
  sourceUrl: "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
} as const;

export type MarsWeatherObservation = {
  terrestrialDate: string;
  sol: string;
  season: string;
  minimumC: number;
  maximumC: number;
  pressurePa: number | null;
  status: "NASA API" | "last-known NASA archive";
};

type MarsWeatherRow = {
  terrestrial_date?: string;
  sol?: string | number;
  season?: string;
  min_temp?: number | string;
  max_temp?: number | string;
  pressure?: number | string;
};

export const NASA_MARS_WEATHER_URL = "https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json";
const lastKnownMarsWeather: MarsWeatherObservation = {
  terrestrialDate: "2024-04-27",
  sol: "1133",
  season: "late autumn",
  minimumC: -79.3,
  maximumC: -24.7,
  pressurePa: 778.9,
  status: "last-known NASA archive",
};

function finiteNumber(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && value !== "--") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function fetchLatestMarsWeather(signal?: AbortSignal): Promise<MarsWeatherObservation> {
  try {
    const response = await fetch(NASA_MARS_WEATHER_URL, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`NASA Mars weather feed returned ${response.status}`);
    const payload = await response.json() as { sols?: MarsWeatherRow[] };
    const latest = (payload.sols ?? [])
      .map((row) => ({ row, minimumC: finiteNumber(row.min_temp), maximumC: finiteNumber(row.max_temp) }))
      .filter((item): item is { row: MarsWeatherRow; minimumC: number; maximumC: number } => item.minimumC !== null && item.maximumC !== null && Boolean(item.row.terrestrial_date))
      .sort((a, b) => String(b.row.terrestrial_date).localeCompare(String(a.row.terrestrial_date)))[0];
    if (!latest) throw new Error("No complete weather observation in NASA feed");
    return {
      terrestrialDate: latest.row.terrestrial_date!,
      sol: String(latest.row.sol ?? "—"),
      season: latest.row.season ?? "Season not listed",
      minimumC: latest.minimumC,
      maximumC: latest.maximumC,
      pressurePa: finiteNumber(latest.row.pressure),
      status: "NASA API",
    };
  } catch {
    return lastKnownMarsWeather;
  }
}

export function topographyForSite(site: Site): EarthTopographySample | null {
  return earthTopographyBySite[site.id] ?? null;
}
