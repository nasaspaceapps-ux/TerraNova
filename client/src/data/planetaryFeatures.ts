export type PlanetaryFeatureBody = "Moon" | "Mars";

export type PlanetaryFeature = {
  id: string;
  body: PlanetaryFeatureBody;
  name: string;
  nameAr: string;
  region: string;
  regionAr: string;
  featureType: string;
  latitude: number;
  longitudeEast: number;
  coordinateConvention: "IAU signed east longitude; planetocentric latitude";
  sourceLabel: "USGS/IAU Gazetteer";
  sourceUrl: string;
  note: string;
};

const gazetteerUrl = "https://planetarynames.wr.usgs.gov/";

export const planetaryFeatures: PlanetaryFeature[] = [
  {
    id: "moon-shackleton", body: "Moon", name: "Shackleton Crater", nameAr: "فوهة شاكلتون", region: "South polar region", regionAr: "المنطقة القطبية الجنوبية", featureType: "Crater", latitude: -89.67, longitudeEast: 129.78,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Gazetteer center point; not a crater boundary or landing-site designation.",
  },
  {
    id: "moon-mare-tranquillitatis", body: "Moon", name: "Mare Tranquillitatis", nameAr: "بحر الهدوء", region: "Near side · lunar equatorial region", regionAr: "الوجه القريب · المنطقة الاستوائية", featureType: "Mare", latitude: 8.3487, longitudeEast: 30.8346,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Gazetteer center point; the named mare spans a broad area.",
  },
  {
    id: "moon-tycho", body: "Moon", name: "Tycho Crater", nameAr: "فوهة تيخو", region: "Southern lunar highlands", regionAr: "المرتفعات القمرية الجنوبية", featureType: "Crater", latitude: -43.2958, longitudeEast: -11.2153,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Negative longitude denotes west in the signed-east convention.",
  },
  {
    id: "mars-jezero", body: "Mars", name: "Jezero Crater", nameAr: "فوهة جيزيرو", region: "Isidis Planitia · Perseverance landing region", regionAr: "سهل إيسيديس · منطقة هبوط بيرسيفيرانس", featureType: "Crater", latitude: 18.4082, longitudeEast: 77.6873,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Gazetteer feature center; the rover landing area is a separate, smaller location.",
  },
  {
    id: "mars-gale", body: "Mars", name: "Gale Crater", nameAr: "فوهة غيل", region: "Aeolis quadrangle · Curiosity region", regionAr: "مربع إيوليس · منطقة كيوريوسيتي", featureType: "Crater", latitude: -5.3672, longitudeEast: 137.811,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Gazetteer feature center; not a rover traverse boundary.",
  },
  {
    id: "mars-olympus-mons", body: "Mars", name: "Olympus Mons", nameAr: "جبل أوليمبوس", region: "Tharsis volcanic province", regionAr: "الإقليم البركاني ثارسيس", featureType: "Mons", latitude: 18.6528, longitudeEast: -133.8025,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Negative longitude denotes west in the signed-east convention; the named volcano spans a broad area.",
  },
  {
    id: "mars-elysium-planitia", body: "Mars", name: "Elysium Planitia", nameAr: "سهل إليسيوم", region: "Elysium volcanic province", regionAr: "الإقليم البركاني إليسيوم", featureType: "Planitia", latitude: 2.979, longitudeEast: 154.7372,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Gazetteer center point; the named plain is much larger than the marker.",
  },
  {
    id: "mars-valles-marineris", body: "Mars", name: "Valles Marineris", nameAr: "أودية مارينر", region: "Equatorial canyon system", regionAr: "نظام أخاديد استوائي", featureType: "Valles", latitude: -14.0059, longitudeEast: -58.5877,
    coordinateConvention: "IAU signed east longitude; planetocentric latitude", sourceLabel: "USGS/IAU Gazetteer", sourceUrl: gazetteerUrl, note: "Negative longitude denotes west; the named canyon system extends across thousands of kilometres.",
  },
];

export function planetaryFeaturesFor(body: PlanetaryFeatureBody) {
  return planetaryFeatures.filter((feature) => feature.body === body);
}
