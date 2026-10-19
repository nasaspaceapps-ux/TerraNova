export const NASA_POWER_DOCS = "https://power.larc.nasa.gov/docs/services/api/temporal/climatology/";

const monthKeys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
export const powerMonths = monthKeys;

export type ClimateSnapshot = {
  temperatureAnnual: number | null;
  precipitationAnnual: number | null;
  temperatureByMonth: Record<(typeof monthKeys)[number], number | null>;
  precipitationByMonth: Record<(typeof monthKeys)[number], number | null>;
  temperatureUnit: string;
  precipitationUnit: string;
  period: string;
  source: string;
};

type Series = Partial<Record<(typeof monthKeys)[number] | "ANN", number>>;
type PowerPayload = {
  header?: { range?: string; sources?: string[] };
  properties?: { parameter?: { T2M?: Series; PRECTOTCORR?: Series } };
  parameters?: {
    T2M?: { units?: string };
    PRECTOTCORR?: { units?: string };
  };
};

const cache = new Map<string, Promise<ClimateSnapshot>>();

function validValue(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > -900 ? value : null;
}

function mapMonths(series?: Series): ClimateSnapshot["temperatureByMonth"] {
  return Object.fromEntries(monthKeys.map((month) => [month, validValue(series?.[month])])) as ClimateSnapshot["temperatureByMonth"];
}

export function fetchNasaPowerClimatology(latitude: number, longitude: number): Promise<ClimateSnapshot> {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL("https://power.larc.nasa.gov/api/temporal/climatology/point");
  url.searchParams.set("parameters", "T2M,PRECTOTCORR");
  url.searchParams.set("community", "RE");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("format", "JSON");

  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`NASA POWER returned HTTP ${response.status}`);
    const payload = await response.json() as PowerPayload;
    const temperature = payload.properties?.parameter?.T2M;
    const precipitation = payload.properties?.parameter?.PRECTOTCORR;
    if (!temperature || !precipitation) throw new Error("NASA POWER did not return the requested climate parameters");
    const range = payload.header?.range ?? "NASA POWER climatology period";
    const period = range.match(/\(([^)]+)\)/)?.[1] ?? range;
    return {
      temperatureAnnual: validValue(temperature.ANN),
      precipitationAnnual: validValue(precipitation.ANN),
      temperatureByMonth: mapMonths(temperature),
      precipitationByMonth: mapMonths(precipitation),
      temperatureUnit: payload.parameters?.T2M?.units === "C" ? "°C" : payload.parameters?.T2M?.units ?? "°C",
      precipitationUnit: payload.parameters?.PRECTOTCORR?.units ?? "mm/day",
      period,
      source: payload.header?.sources?.join(", ") || "NASA POWER",
    };
  });

  cache.set(key, request);
  request.catch(() => cache.delete(key));
  return request;
}
