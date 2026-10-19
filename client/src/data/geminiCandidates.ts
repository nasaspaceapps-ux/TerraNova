import rawRows from "@/data/geminiCandidates.raw.json";
import type { Site, SiteSource } from "@/data/sites";

type CoordinateOverride = Partial<Pick<Site, "lat" | "lon" | "coordinateStatus" | "coordinateSource" | "coordinateNote">> & {
  sources?: SiteSource[];
};

const verifiedCoordinateOverrides: Record<string, CoordinateOverride> = {
  "excel-02": {
    lat: null,
    lon: null,
    coordinateStatus: "unresolved",
    coordinateSource: "GEUS Bulletin",
    coordinateNote: "The geological complex is extensive; the reviewed source gives no verified point coordinate. No regional centroid was inferred.",
    sources: [{ label: "GEUS Bulletin · Fiskenæsset complex", url: "https://geusbulletin.org/index.php/geusb/article/view/4980" }],
  },
  "excel-03": {
    lat: 22.0183333333,
    lon: 26.0875,
    coordinateStatus: "verified-site",
    coordinateSource: "Peer-reviewed Kamil Crater study",
    coordinateNote: "Published crater-site coordinate 22°01′06″N, 26°05′15″E converted to decimal degrees; this is the crater, not the surrounding region.",
    sources: [{ label: "Geological and geophysical investigation of Kamil crater", url: "https://onlinelibrary.wiley.com/doi/full/10.1111/maps.12023" }],
  },
  "excel-04": {
    lat: 44.08,
    lon: 128.83,
    coordinateStatus: "verified-site",
    coordinateSource: "Smithsonian Global Volcanism Program",
    coordinateNote: "Coordinates published for Jingpohu volcanic field; datum is not specified in the source.",
    sources: [{ label: "Smithsonian GVP · Jingpohu", url: "https://volcano.si.edu/volcano.cfm?vn=305040" }],
  },
  "excel-05": {
    lat: -18.2007,
    lon: 144.6588,
    coordinateStatus: "representative-only",
    coordinateSource: "Undara volcano representative point",
    coordinateNote: "Published coordinates identify Undara volcano, used only as a representative point for the broader lava-tube system; not a system centroid.",
    sources: [{ label: "Undara lava tubes · coordinate reference", url: "https://storymaps.arcgis.com/stories/28aac0f24fe44eadb52f45d9509a31f9" }],
  },
  "excel-06": {
    lat: null,
    lon: null,
    coordinateStatus: "unresolved",
    coordinateSource: "Peer-reviewed La Corona tube-system study",
    coordinateNote: "The reviewed paper maps the system but does not provide a verified WGS84 point for La Corona or Jameo Agujerado; no island-level point was substituted.",
    sources: [{ label: "Inception and Evolution of La Corona Lava Tube System", url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2022JB024056" }],
  },
  "excel-42": {
    lat: 64.965315,
    lon: -16.598457,
    coordinateStatus: "representative-only",
    coordinateSource: "OpenStreetMap Nominatim · relation 13737263",
    coordinateNote: "Nominatim matched the mapped Dyngjusandur sandsheet; this representative coordinate is for visualization and is not a survey point or full feature boundary.",
    sources: [{ label: "OpenStreetMap · Dyngjusandur", url: "https://www.openstreetmap.org/relation/13737263" }],
  },
  "excel-44": {
    lat: 36.815974,
    lon: 11.986735,
    coordinateStatus: "representative-only",
    coordinateSource: "OpenStreetMap Nominatim · way 28736558",
    coordinateNote: "Nominatim matched Lago Specchio di Venere, the lake on Pantelleria named Bagno dell’Acqua in the workbook; representative map point only, not a measured analog-site boundary.",
    sources: [{ label: "OpenStreetMap · Lago Specchio di Venere", url: "https://www.openstreetmap.org/way/28736558" }],
  },
};

const sourceRows = rawRows as unknown as Site[];

export const geminiCandidates: Site[] = sourceRows.map((row) => {
  const override = verifiedCoordinateOverrides[row.id];
  const { sources: coordinateSources = [], ...coordinateFields } = override ?? {};
  const workbookSource = row.sourceLabel && row.sourceUrl
    ? [{ label: row.sourceLabel, url: row.sourceUrl }]
    : [];
  return {
    ...row,
    ...coordinateFields,
    origin: "excel",
    kind: "Exploratory candidate",
    confidence: "Unverified lead",
    sources: [...workbookSource, ...coordinateSources],
    coordinateNote: coordinateFields.coordinateNote ?? row.coordinateNote,
  };
});
