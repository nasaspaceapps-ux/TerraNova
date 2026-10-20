import type { Site } from "@/data/sites";

type TerrainLike = { medianSlopeDeg: number; reliefP90P10M: number | null } | null | undefined;

export type MissionScenarioId = "moon-base" | "mars-outpost" | "training" | "landing-screen";
export type EvidenceBand = "high" | "medium" | "low" | "unresolved";

export type MissionScenario = {
  id: MissionScenarioId;
  label: string;
  labelAr: string;
  short: string;
  shortAr: string;
  target: "Moon" | "Mars" | "Both";
  weights: { terrain: number; evidence: number; coordinate: number; environment: number; access: number };
};

export const missionScenarios: MissionScenario[] = [
  { id: "moon-base", label: "Permanent Moon base", labelAr: "قاعدة قمرية دائمة", short: "Moon base", shortAr: "قاعدة القمر", target: "Moon", weights: { terrain: .28, evidence: .25, coordinate: .18, environment: .17, access: .12 } },
  { id: "mars-outpost", label: "Mars science outpost", labelAr: "موقع أبحاث للمريخ", short: "Mars outpost", shortAr: "موقع المريخ", target: "Mars", weights: { terrain: .24, evidence: .24, coordinate: .16, environment: .25, access: .11 } },
  { id: "training", label: "Astronaut field training", labelAr: "تدريب ميداني لرواد الفضاء", short: "Field training", shortAr: "تدريب ميداني", target: "Both", weights: { terrain: .23, evidence: .25, coordinate: .16, environment: .16, access: .20 } },
  { id: "landing-screen", label: "Landing-site screening", labelAr: "فحص أولي لموقع هبوط", short: "Landing screen", shortAr: "فحص الهبوط", target: "Both", weights: { terrain: .35, evidence: .23, coordinate: .20, environment: .12, access: .10 } },
];

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

export function evidenceBandForSite(site: Site): EvidenceBand {
  if (site.lat === null || site.lon === null) return "unresolved";
  if (site.confidence === "Context reference" && site.coordinateStatus === "verified-site" && (site.sources?.length ?? 0) >= 2) return "high";
  if (site.origin === "ai" || site.confidence === "AI hypothesis" || site.confidence === "Unverified lead") return "low";
  if (site.coordinateStatus?.includes("approx") || site.coordinateStatus === "representative-only" || (site.sources?.length ?? 0) < 1) return "medium";
  return "high";
}

export function evidenceLabel(band: EvidenceBand) {
  return band === "high" ? "HIGH EVIDENCE" : band === "medium" ? "PARTIAL EVIDENCE" : band === "low" ? "REVIEW REQUIRED" : "NO DEFENSIBLE PIN";
}

function evidenceScore(site: Site) {
  return ({ high: 92, medium: 62, low: 28, unresolved: 8 })[evidenceBandForSite(site)];
}

function coordinateScore(site: Site) {
  if (site.lat === null || site.lon === null) return 5;
  if (site.coordinateStatus === "verified-site") return 96;
  if (site.coordinateStatus === "representative-only") return 54;
  if (site.coordinateStatus?.includes("approx")) return 62;
  if (site.coordinateStatus === "unverified-geocode") return 38;
  return 48;
}

function environmentScore(site: Site, scenario: MissionScenario) {
  const text = `${site.tags.join(" ")} ${site.environment ?? ""} ${site.analogCategory ?? ""}`.toLowerCase();
  const keywords = scenario.id === "moon-base" ? ["basalt", "lava", "volcanic", "rough"] : scenario.id === "mars-outpost" ? ["arid", "desert", "cold", "remote", "crater"] : ["desert", "basalt", "volcanic", "remote", "high altitude"];
  return clamp(42 + keywords.filter((word) => text.includes(word)).length * 12);
}

export function calculateMissionScore(site: Site, terrain: TerrainLike, scenario: MissionScenario) {
  const terrainScore = terrain ? clamp(100 - Math.abs(terrain.medianSlopeDeg - (scenario.target === "Moon" ? 8 : 6)) * 4 - (terrain.reliefP90P10M === null ? 0 : Math.min(25, terrain.reliefP90P10M / 40))) : 38;
  const evidence = evidenceScore(site);
  const coordinate = coordinateScore(site);
  const environment = environmentScore(site, scenario);
  const access = clamp(48 + (site.tags.some((tag) => /remote|polar|high altitude/i.test(tag)) ? -15 : 14) + (site.origin === "excel" ? -4 : 0));
  const { weights } = scenario;
  const score = clamp(terrainScore * weights.terrain + evidence * weights.evidence + coordinate * weights.coordinate + environment * weights.environment + access * weights.access);
  const band = evidenceBandForSite(site);
  const strongest = ([
    ["terrain", terrainScore], ["evidence", evidence], ["coordinate", coordinate], ["environment", environment], ["access", access],
  ] as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const caveat = band === "unresolved" ? "No defensible coordinate; this record cannot support field screening." : band === "low" ? "Treat as a hypothesis and verify the primary source before field use." : band === "medium" ? "Useful for triage, but the pin or supporting evidence is approximate." : "Context is comparatively well supported, but this remains an Earth analogue—not a landing recommendation.";
  return { score, terrainScore, evidence, coordinate, environment, access, band, strongest, caveat };
}
