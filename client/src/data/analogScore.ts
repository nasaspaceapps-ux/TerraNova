import { lunarSite04, marsJezero } from "@/data/planetaryProfiles";
import type { EarthTerrainWindow } from "@/data/earthTerrain";

export type AnalogTargetBody = "Moon" | "Mars";
export type AnalogScoreFactor = {
  id: "slope" | "relief";
  label: string;
  earthValue: number;
  referenceValue: number;
  unit: "°" | "m";
  weight: number;
  similarity: number;
  method: string;
};

export type AnalogScoreResult = {
  score: number | null;
  coverage: number;
  factors: AnalogScoreFactor[];
  supportWidthKm: number;
  referenceName: string;
  interpretation: string;
};

const weights = { slope: 0.6, relief: 0.4 } as const;
const slopeToleranceDeg = 20;

export const analogReferences: Record<AnalogTargetBody, {
  name: string;
  slopeMedianDeg: number;
  reliefP90P10M: number | null;
  supportWidthKm: number;
  sourceUrl: string;
}> = {
  Moon: {
    name: "LOLA Site04 · south polar 5 × 5 km window",
    slopeMedianDeg: lunarSite04.slopeMedianDeg,
    reliefP90P10M: lunarSite04.elevationP90M - lunarSite04.elevationP10M,
    supportWidthKm: 5,
    sourceUrl: lunarSite04.sourceUrl,
  },
  Mars: {
    name: "MOLA Jezero · 3 × 3 cells (~11 km footprint)",
    slopeMedianDeg: marsJezero.localSlopeDeg,
    reliefP90P10M: null,
    supportWidthKm: 11,
    sourceUrl: marsJezero.sourceUrl,
  },
};

function linearSimilarity(a: number, b: number, tolerance: number) {
  return Math.max(0, 100 * (1 - Math.abs(a - b) / tolerance));
}

function reliefSimilarity(earthRelief: number, referenceRelief: number) {
  const logDifference = Math.abs(Math.log((earthRelief + 1) / (referenceRelief + 1)));
  return Math.max(0, 100 * (1 - logDifference / Math.log(4)));
}

export function calculateAnalogScore(
  earth: EarthTerrainWindow | null,
  body: AnalogTargetBody,
): AnalogScoreResult {
  const reference = analogReferences[body];
  const factors: AnalogScoreFactor[] = [];

  if (earth && Number.isFinite(earth.medianSlopeDeg)) {
    factors.push({
      id: "slope",
      label: "Regional median slope",
      earthValue: earth.medianSlopeDeg,
      referenceValue: reference.slopeMedianDeg,
      unit: "°",
      weight: weights.slope,
      similarity: linearSimilarity(earth.medianSlopeDeg, reference.slopeMedianDeg, slopeToleranceDeg),
      method: `max(0, 100 × (1 − |Δ slope| / ${slopeToleranceDeg}°))`,
    });
  }

  const supportCompatible = earth && Math.max(earth.supportWidthKm, reference.supportWidthKm) / Math.min(earth.supportWidthKm, reference.supportWidthKm) <= 1.25;
  if (earth && reference.reliefP90P10M !== null && earth.reliefP90P10M !== null && supportCompatible) {
    factors.push({
      id: "relief",
      label: "Local relief · P90−P10",
      earthValue: earth.reliefP90P10M,
      referenceValue: reference.reliefP90P10M,
      unit: "m",
      weight: weights.relief,
      similarity: reliefSimilarity(earth.reliefP90P10M, reference.reliefP90P10M),
      method: "max(0, 100 × (1 − |ln((R_E+1)/(R_P+1))| / ln(4)))",
    });
  }

  const availableWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const score = availableWeight > 0
    ? Math.round(factors.reduce((sum, factor) => sum + factor.similarity * factor.weight, 0) / availableWeight)
    : null;
  const coverage = Math.round(availableWeight * 100);

  return {
    score,
    coverage,
    factors,
    supportWidthKm: reference.supportWidthKm,
    referenceName: reference.name,
    interpretation: body === "Moon"
      ? "Terrain-screening proxy only. Earth relief is a sparse 9-point ASTER sample; LOLA statistics come from a dense 5 × 5 km raster window."
      : "Terrain-screening proxy only. MOLA relief is not included because no compatible reference relief statistic is available.",
  };
}
