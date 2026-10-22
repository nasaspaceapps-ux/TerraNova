export type PlanetBody = "Earth" | "Moon" | "Mars";

export type PlanetDefinition = {
  label: string;
  model: string;
  texture: string;
  source: string;
  sourceUrl: string;
  note: string;
  glow: number;
};

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const planetDefinitions: Record<PlanetBody, PlanetDefinition> = {
  Earth: {
    label: "Earth",
    model: publicAsset("models/nasa-earth.glb"),
    texture: publicAsset("textures/earth-blue-marble.jpg"),
    source: "NASA Solar System OpenData · 3D Earth",
    sourceUrl: "https://solarsystem.nasa.gov/gltf_embed/2393/",
    note: "Official NASA GLB model stored locally for stable rendering; not an analytical elevation layer.",
    glow: 0x579bd5,
  },
  Moon: {
    label: "Moon",
    model: publicAsset("models/nasa-moon.glb"),
    texture: publicAsset("textures/moon-lro-cgi.jpg"),
    source: "NASA Solar System OpenData · 3D Moon",
    sourceUrl: "https://solarsystem.nasa.gov/gltf_embed/2366/",
    note: "Official NASA GLB model stored locally for stable rendering; use LOLA products, not the model mesh, for measurements.",
    glow: 0xabb6c6,
  },
  Mars: {
    label: "Mars",
    model: publicAsset("models/nasa-mars.glb"),
    texture: publicAsset("textures/mars-viking-mosaic.jpg"),
    source: "NASA Science · 3D Mars model",
    sourceUrl: "https://science.nasa.gov/resource/planet-mars-3d-model/",
    note: "Official NASA GLB model stored locally for stable rendering; use MOLA/HRSC products, not the model mesh, for measurements.",
    glow: 0xd77950,
  },
};

export type EarthProductDefinition = {
  shortName: "SRTMGL1" | "MOD11A1";
  expectedTitle: string;
  landingPage: string;
  resolution: string;
  coverage: string;
  period: string;
};

export const earthDataProducts: EarthProductDefinition[] = [
  {
    shortName: "SRTMGL1",
    expectedTitle: "NASA Shuttle Radar Topography Mission Global 1 arc second V003",
    landingPage: "https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003",
    resolution: "30 × 30 m elevation cells",
    coverage: "Land between 60°N and 56°S; not full polar coverage",
    period: "SRTM mission acquisitions: February 2000",
  },
  {
    shortName: "MOD11A1",
    expectedTitle: "MODIS/Terra Land Surface Temperature/Emissivity Daily L3 Global 1km SIN Grid V061",
    landingPage: "https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11a1-061",
    resolution: "1 km; daily product",
    coverage: "Global; land-surface temperature, not air temperature",
    period: "24 Feb 2000 to present in the catalog",
  },
];

export type LiveEarthProduct = EarthProductDefinition & {
  title: string;
  conceptId: string;
  version: string;
  doi: string;
  abstract: string;
  status: "live" | "fallback";
};

type CmrItem = {
  meta?: { "concept-id"?: string };
  umm?: {
    EntryTitle?: string;
    Version?: string;
    DOI?: { DOI?: string };
    Abstract?: string;
  };
};

export async function fetchEarthDataCollections(signal?: AbortSignal): Promise<LiveEarthProduct[]> {
  return Promise.all(earthDataProducts.map(async (product) => {
    try {
      const url = new URL("https://cmr.earthdata.nasa.gov/search/collections.umm_json");
      url.searchParams.set("short_name", product.shortName);
      url.searchParams.set("page_size", "1");
      const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`NASA CMR returned HTTP ${response.status}`);
      const payload = await response.json() as { items?: CmrItem[] };
      const item = payload.items?.[0];
      const metadata = item?.umm;
      if (!metadata) throw new Error("NASA CMR did not return a collection record");
      return {
        ...product,
        title: metadata.EntryTitle ?? product.expectedTitle,
        conceptId: item?.meta?.["concept-id"] ?? "Not listed",
        version: metadata.Version ?? "Not listed",
        doi: metadata.DOI?.DOI ?? "Not listed",
        abstract: metadata.Abstract ?? "NASA CMR returned this collection without an abstract.",
        status: "live" as const,
      };
    } catch {
      return {
        ...product,
        title: product.expectedTitle,
        conceptId: "Catalog unavailable",
        version: "See NASA Earthdata record",
        doi: "See NASA Earthdata record",
        abstract: "The NASA CMR request was unavailable. Open the official collection landing page for current metadata.",
        status: "fallback" as const,
      };
    }
  }));
}

export const planetarySources = [
  {
    group: "EARTH · VISUAL",
    label: "Blue Marble: Next Generation — base map",
    description: "NASA Earth Observatory · global 5400×2700 preview (~8 km/px) used as a globe texture; higher-resolution tiled products are separate.",
    url: "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/",
  },
  {
    group: "EARTH · HISTORICAL CLIMATE",
    label: "NASA POWER Climatology API · MERRA-2",
    description: "Live 25-year point climatology for 2 m air temperature and corrected precipitation; output period, units and model source are read from each response.",
    url: "https://power.larc.nasa.gov/docs/services/api/temporal/climatology/",
  },
  {
    group: "MOON · LRO / LROC / LOLA",
    label: "NASA CGI Moon Kit",
    description: "Color and elevation maps assembled from LRO camera and laser-altimeter data. NASA states the color map is for visualization, not scientific measurement.",
    url: "https://svs.gsfc.nasa.gov/4720/",
  },
  {
    group: "MOON · LROC WAC",
    label: "Global morphology mosaic · 100 m/px",
    description: "USGS Astrogeology catalog entry for the LRO/LROC WAC global mosaic; the full product is about 5.5 GB. The globe uses a compressed preview.",
    url: "https://astrogeology.usgs.gov/search/map/moon_lro_lroc_wac_global_morphology_mosaic_100m",
  },
  {
    group: "MOON · LOLA",
    label: "Lunar Orbiter Laser Altimeter archive",
    description: "NASA PDS source pathway for lunar elevation products; no elevation samples have yet been extracted for the terrestrial sites.",
    url: "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
  },
  {
    group: "MARS · MOLA",
    label: "MGS MOLA MEGDR global topography",
    description: "NASA PDS global elevation, radius, areoid and observation-count maps at 4–128 pixels/degree.",
    url: "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
  },
  {
    group: "MARS · VIKING",
    label: "Viking colorized global mosaic · 232 m/px",
    description: "NASA Ames mosaic distributed by USGS Astrogeology. The full global raster is about 12 GB; the globe uses a compressed preview.",
    url: "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
  },
  {
    group: "ANALOG SITES",
    label: "NASA Planetary Analog Explorer",
    description: "NASA's published Earth–Moon/Mars analog gallery, including Atacama–Mars, Iceland–Moon/Mars and basaltic field examples.",
    url: "https://science.nasa.gov/solar-system/analog-explorer/",
  },
  {
    group: "GOOGLE SCHOLAR · PAPER REVIEWED",
    label: "Terrestrial Analogues to Mars and the Moon: Canada’s Role",
    description: "Osinski et al. · Geoscience Canada 33(4), 175–188 (2006). Analogues reproduce selected conditions; they do not establish full planetary equivalence.",
    url: "https://www.erudit.org/en/journals/geocan/2006-v33-n4-geocan_33_4art01/",
  },
  {
    group: "EARTH · TOPOGRAPHY",
    label: "ASTER GDEM V003 · NASA/METI",
    description: "NASA Earthdata product: 1 arc-second (~30 m at equator), acquisitions 2000–2013, WGS84/EGM96. Point elevations use the OpenTopoData ASTER30m V3 public API; retrieved 2026-10-15.",
    url: "https://www.earthdata.nasa.gov/data/catalog/lpcloud-astgtm-003",
  },
  {
    group: "EARTH · POINT SAMPLING",
    label: "OpenTopoData ASTER30m API",
    description: "Public point sampler for ASTER GDEM version 3; nearest-neighbour samples at approximate map pins and four nearby points for a local slope estimate.",
    url: "https://www.opentopodata.org/datasets/aster/",
  },
  {
    group: "MOON · LOLA SITE04 SAMPLE",
    label: "LOLA high-resolution South Pole DEM · Site04",
    description: "5 m/pixel DEM and slope; statistics from a central 5×5 km window. About 90% of 5 m pixels are interpolated; NASA reports nonzero height and slope uncertainty.",
    url: "https://pgda.gsfc.nasa.gov/products/78",
  },
  {
    group: "MOON · THERMAL · DIVINER",
    label: "Diviner south-polar bolometric temperature",
    description: "345 valid observations within 2.5 km of the Site04 reference coordinate in the 240 m grid bin LS330/SLON15 (2009–2020); surface brightness temperature, not air temperature or annual climate.",
    url: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm",
  },
  {
    group: "MARS · TOPOGRAPHY · MOLA JEZERO SAMPLE",
    label: "MOLA MEGDR · Jezero reference cell",
    description: "NASA PDS MEGT90N000EB · 16 pixels/degree. The -2609 m cell and 0.671° 3×3 slope estimate use the PDS central-meridian convention; heights are relative to the Goddard Mars areoid.",
    url: "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
  },
  {
    group: "MARS · WEATHER · PERSEVERANCE",
    label: "NASA Mars 2020 daily weather archive",
    description: "NASA Mars weather feed for the Jezero rover region. The latest complete record currently returned is 2024-04-27 (Sol 1133); it is a single archived weather report, not a climate normal.",
    url: "https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json",
  },
];
