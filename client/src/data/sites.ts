import { geminiCandidates } from "@/data/geminiCandidates";

export type Target = "Moon" | "Mars" | "Both";
export type SiteKind = "Reference analog" | "Exploratory candidate" | "AI-generated lead";
export type SiteOrigin = "reference" | "excel" | "ai";
export type SiteSource = { label: string; url: string };

export type Site = {
  id: string;
  name: string;
  nameAr?: string;
  location: string;
  country: string;
  lat: number | null;
  lon: number | null;
  target: Target;
  kind: SiteKind;
  confidence: "Context reference" | "Exploratory" | "Unverified lead" | "AI hypothesis";
  origin: SiteOrigin;
  tags: string[];
  description: string;
  why: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sources?: SiteSource[];
  coordinatesText?: string;
  coordinateStatus?: string;
  coordinateSource?: string;
  coordinateNote?: string;
  spreadsheetRow?: number;
  goalFeature?: string;
  analogCategory?: string;
  geology?: string;
  environment?: string;
  missionApplications?: string;
  sourceFields?: Record<string, string>;
  temporary?: boolean;
  aiGenerated?: boolean;
};

const nasaAnalogExplorer = "https://science.nasa.gov/solar-system/analog-explorer/";
const analogContextSource = [{ label: "NASA Planetary Analog Explorer · context reference", url: nasaAnalogExplorer }];

const referenceSites: Site[] = [
  {
    id: "atacama", name: "Atacama Desert", nameAr: "صحراء أتاكاما", location: "Antofagasta Region", country: "Chile", lat: -23.5, lon: -68.4,
    target: "Mars", kind: "Reference analog", confidence: "Context reference", origin: "reference",
    tags: ["hyper-arid", "high altitude", "Mars", "desert", "volcanic"],
    description: "A familiar high-altitude desert reference retained for context; the pin is approximate and is not a site boundary.",
    why: "Context reference only. Its point location and this broad analog label are not a measured match or field-suitability assessment.",
    sourceLabel: "Curated context reference; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Approximate display point for a broad region; not a surveyed boundary.",
  },
  {
    id: "haughton", name: "Haughton Crater", nameAr: "فوهة هوتون", location: "Devon Island, Nunavut", country: "Canada", lat: 75.4, lon: -89.7,
    target: "Mars", kind: "Reference analog", confidence: "Context reference", origin: "reference",
    tags: ["impact crater", "polar", "cold", "Mars", "remote"],
    description: "Arctic impact-crater context reference. The map pin is approximate; the crater outline is not represented.",
    why: "Context reference only; terrain, climate and logistics have not been combined into a validated analogue score.",
    sourceLabel: "Curated context reference; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Approximate display point; not a surveyed crater center or boundary.",
  },
  {
    id: "dry-valleys", name: "McMurdo Dry Valleys", nameAr: "الوديان الجافة في ماكموردو", location: "Victoria Land, Antarctica", country: "Antarctica", lat: -77.5, lon: 162.0,
    target: "Mars", kind: "Reference analog", confidence: "Context reference", origin: "reference",
    tags: ["polar desert", "cold", "Mars", "arid", "remote"],
    description: "Cold-desert context reference. The regional marker does not describe the full valley system.",
    why: "A screening reference only. Terrestrial polar conditions are not equivalent to the Martian surface.",
    sourceLabel: "Curated context reference; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Approximate point in a broad regional system.",
  },
  {
    id: "death-valley", name: "Death Valley", nameAr: "وادي الموت", location: "California–Nevada", country: "United States", lat: 36.2, lon: -116.8,
    target: "Both", kind: "Reference analog", confidence: "Context reference", origin: "reference",
    tags: ["desert", "basin", "arid", "Mars", "Moon"],
    description: "Hot, arid basin retained as a field-testing context reference; no site boundary is implied.",
    why: "Context only. Dryness and relief are separate characteristics; hot Earth temperatures are not a lunar or Martian match.",
    sourceLabel: "Curated context reference; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Approximate display point for the regional feature.",
  },
  {
    id: "namib", name: "Namib Gravel Plains", nameAr: "سهول ناميب الحصوية", location: "Namib Region", country: "Namibia", lat: -24.7, lon: 15.3,
    target: "Mars", kind: "Exploratory candidate", confidence: "Exploratory", origin: "reference",
    tags: ["arid", "gravel", "Mars", "desert", "remote"],
    description: "Broad exploratory region for dry-terrain screening; boundaries and field conditions are not delineated.",
    why: "A hypothesis for GIS screening only. The approximate point does not represent a verified field site.",
    sourceLabel: "Curated context candidate; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Regional display point; not a surveyed site coordinate.",
  },
  {
    id: "reykjanes", name: "Reykjanes Lava Fields", nameAr: "حقول لافا ريكيافيك", location: "Reykjanes Peninsula", country: "Iceland", lat: 63.9, lon: -22.3,
    target: "Moon", kind: "Exploratory candidate", confidence: "Exploratory", origin: "reference",
    tags: ["basalt", "lava field", "Moon", "volcanic", "rough terrain"],
    description: "Volcanic-terrain screening candidate; the regional pin is approximate and does not identify a tested field transect.",
    why: "A geology-led hypothesis, not a compositional equivalence claim or an engineering-suitability assessment.",
    sourceLabel: "Curated context candidate; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Regional display point; not a surveyed field site.",
  },
  {
    id: "lanzarote", name: "Lanzarote Volcanic Terrain", nameAr: "تضاريس لانزاروت البركانية", location: "Canary Islands", country: "Spain", lat: 29.0, lon: -13.6,
    target: "Moon", kind: "Exploratory candidate", confidence: "Exploratory", origin: "reference",
    tags: ["lava", "volcanic", "Moon", "arid", "basalt"],
    description: "Regional volcanic-landscape screening example; local access and protected-area constraints are not assessed.",
    why: "Exploratory geology hypothesis only. The map pin is approximate and not a mapped site boundary.",
    sourceLabel: "Curated context candidate; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Regional display point; not a surveyed boundary.",
  },
  {
    id: "dhofar", name: "Dhofar Highlands", nameAr: "مرتفعات ظفار", location: "Dhofar Governorate", country: "Oman", lat: 17.1, lon: 54.2,
    target: "Mars", kind: "Exploratory candidate", confidence: "Exploratory", origin: "reference",
    tags: ["arid", "highlands", "Mars", "remote"],
    description: "Broad arid-region screening example; the marker does not delimit a field site.",
    why: "A hypothesis for further GIS analysis, not a validated analogue claim.",
    sourceLabel: "Curated context candidate; point not site-verified", sources: analogContextSource,
    coordinateStatus: "approximate reference pin", coordinateNote: "Regional display point; not a surveyed boundary.",
  },
];

export const sites: Site[] = [...referenceSites, ...geminiCandidates];
