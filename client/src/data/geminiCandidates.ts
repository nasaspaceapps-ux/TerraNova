import rawRows from "@/data/geminiCandidates.raw.json";
import type { Site, SiteSource } from "@/data/sites";

type CoordinateOverride = Partial<Pick<Site, "lat" | "lon" | "coordinateStatus" | "coordinateSource" | "coordinateNote">> & {
  sources?: SiteSource[];
};

const verifiedCoordinateOverrides: Record<string, CoordinateOverride> = {
  "excel-01": {
    lat: 55.8876354462,
    lon: -63.3032226563,
    coordinateStatus: "representative-only",
    coordinateSource: "NASA Earth Observatory map point; corroborated by peer-reviewed Mistastin study",
    coordinateNote: "NASA’s map point is a defensible reference for Mistastin Lake/crater, but it is not a surveyed crater boundary. The workbook’s extra 40 seconds of west longitude is not supported by the peer-reviewed source.",
    sources: [
      { label: "NASA Earth Observatory · Mistastin Lake", url: "https://science.nasa.gov/earth/earth-observatory/violent-formation-for-mistastin-lake-148491/" },
      { label: "Mader et al. 2018 · Mistastin impactites", url: "https://onlinelibrary.wiley.com/doi/full/10.1111/maps.13173" },
    ],
  },
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
    coordinateStatus: "representative-only",
    coordinateSource: "Peer-reviewed Kamil Crater studies; published point, datum not explicitly confirmed as WGS84",
    coordinateNote: "Published crater reference point 22°01′06″N, 26°05′15″E (approximately 22.0183, 26.0875–26.0877). The point identifies Kamil Crater, not a surveyed boundary or landing/base ellipse.",
    sources: [{ label: "D’Orazio et al. · Kamil Crater", url: "https://onlinelibrary.wiley.com/doi/full/10.1111/maps.12023" },
      { label: "Folco et al. · Kamil Crater", url: "https://pubs.geoscienceworld.org/gsa/geology/article/39/2/179/130532/Kamil-Crater-Egypt-Ground-truth-for-small-scale" }],
  },
  "excel-04": {
    lat: 44.08,
    lon: 128.83,
    coordinateStatus: "verified-site",
    coordinateSource: "Smithsonian Global Volcanism Program",
    coordinateNote: "44.08°N, 128.83°E is a Smithsonian GVP representative catalog point only. The field is distributed across approximately 43°52′–44°20′N, 128°30′–129°00′E; no single whole-field centroid is asserted.",
    sources: [{ label: "Smithsonian GVP · Jingpohu", url: "https://volcano.si.edu/volcano.cfm?vn=305040" },
      { label: "UNESCO · Jingpohu UNESCO Global Geopark", url: "https://www.unesco.org/en/iggp/jingpohu-unesco-global-geopark" },
      { label: "Yang et al. · Jingpo Lake Volcanic Field", url: "https://www.mdpi.com/2072-4292/18/3/512" }],
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
