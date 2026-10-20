import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownUp, ArrowUpRight, BadgeCheck, BarChart3, Check, ChevronDown,
  CircleHelp, Database, Download, FileText, Filter, Languages, Layers3, MapPin,
  Pause, Play, Search, SlidersHorizontal, Sparkles, X, ArrowLeftRight,
} from "lucide-react";
import { sites as catalogSites, type Site, type Target } from "@/data/sites";
import { planetaryFeatures, planetaryFeaturesFor } from "@/data/planetaryFeatures";
import { calculateAnalogScore, type AnalogTargetBody } from "@/data/analogScore";
import { fetchEarthTerrainWindow, type EarthTerrainWindow } from "@/data/earthTerrain";
import { gisCentroidMarkers, type GISLayer } from "@/data/gisLayers";
import { planetarySources, type PlanetBody } from "@/data/nasaSources";
import { workbookAudit } from "@/data/workbookAudit";
import { auditForSite, scientificAuditSummary } from "@/data/locationVerification";
import { calculateMissionScore, evidenceBandForSite, evidenceLabel, missionScenarios, type MissionScenarioId } from "@/data/missionScenarios";
import AIScout from "@/components/AIScout";
import NasaClimateSnapshot from "@/components/NasaClimateSnapshot";
import AnalogFinder from "@/components/AnalogFinder";

const EarthGlobeMap = lazy(() => import("@/components/EarthGlobeMap"));
const GISImport = lazy(() => import("@/components/GISImport"));
const NasaEarthCatalog = lazy(() => import("@/components/NasaEarthCatalog"));
const MissionComparator = lazy(() => import("@/components/MissionComparator"));
const PlanetGlobe = lazy(() => import("@/components/PlanetGlobe"));

type RegionFilter = "All regions" | "Africa" | "Americas" | "Asia & Pacific" | "Europe" | "Polar regions" | "Other regions";
type ConfidenceFilter = "Any confidence" | Site["confidence"];
type CoordinateFilter = "All coordinates" | "Coordinates available" | "Unresolved coordinates";
type SortMode = "catalog" | "name" | "score";

const regions: RegionFilter[] = ["All regions", "Africa", "Americas", "Asia & Pacific", "Europe", "Polar regions", "Other regions"];
const targets: Target[] = ["Moon", "Mars", "Both"];
const targetCopy: Record<Target, string> = {
  Moon: "Lunar field-site screening / فحص تضاريس القمر",
  Mars: "Martian environment screening / فحص بيئات المريخ",
  Both: "Cross-target comparison / مقارنة الهدفين",
};

function regionForSite(site: Site): RegionFilter {
  const country = site.country.toLowerCase();
  if (["antarctica", "greenland", "norway"].includes(country) || /svalbard|polar|arctic|antarctica/.test(`${site.location} ${site.name}`.toLowerCase())) return "Polar regions";
  if (["chile", "united states", "canada", "brazil", "ecuador", "mexico", "argentina"].includes(country)) return "Americas";
  if (["namibia", "egypt", "sudan", "libya", "morocco", "south africa"].includes(country)) return "Africa";
  if (["china", "south korea", "iran", "oman", "india", "japan", "australia", "new zealand"].includes(country)) return "Asia & Pacific";
  if (["iceland", "spain", "germany", "france", "italy", "united kingdom", "portugal"].includes(country)) return "Europe";
  return "Other regions";
}

function sitePlace(site: Site) {
  return [site.location.trim(), site.country.trim()].filter(Boolean).join(" · ");
}

function coordinateLabel(site: Site) {
  if (site.lat === null || site.lon === null) return "UNRESOLVED · no map pin";
  return `${site.lat.toFixed(4)}°, ${site.lon.toFixed(4)}°`;
}

function coordinateStatusLabel(site: Site) {
  if (site.lat === null || site.lon === null) return "UNRESOLVED · coordinates not assigned";
  if (site.coordinateStatus === "verified-site") return "SOURCE-VERIFIED POINT";
  if (site.coordinateStatus === "representative-only") return "REPRESENTATIVE POINT · not a boundary";
  if (site.coordinateStatus?.includes("approx")) return "APPROXIMATE MAP PIN";
  if (site.coordinateStatus === "unverified-geocode") return "GEOCODED LEAD · verify before analysis";
  return site.coordinateStatus?.toUpperCase() ?? "COORDINATE STATUS NOT DOCUMENTED";
}

function searchableText(site: Site) {
  return [site.name, site.nameAr, site.location, site.country, site.description, site.why, site.goalFeature,
    site.analogCategory, site.geology, site.environment, site.missionApplications, ...site.tags,
    ...Object.values(site.sourceFields ?? {})].filter(Boolean).join(" ").toLocaleLowerCase();
}

function scoreKey(siteId: string, body: AnalogTargetBody) {
  return `${siteId}:${body}`;
}

function Home() {
  const [target, setTarget] = useState<Target>("Both");
  const [scoreTarget, setScoreTarget] = useState<AnalogTargetBody>("Moon");
  const [activeWorld, setActiveWorld] = useState<PlanetBody>("Earth");
  const [mapView, setMapView] = useState<"map" | "nasa">("map");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedId, setSelectedId] = useState("reykjanes");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [region, setRegion] = useState<RegionFilter>("All regions");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("Any confidence");
  const [coordinateFilter, setCoordinateFilter] = useState<CoordinateFilter>("All coordinates");
  const [kindFilter, setKindFilter] = useState("All site types");
  const [sortBy, setSortBy] = useState<SortMode>("catalog");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [missionCompareOpen, setMissionCompareOpen] = useState(false);
  const [missionCompareSiteId, setMissionCompareSiteId] = useState("reykjanes");
  const [missionBriefOpen, setMissionBriefOpen] = useState(false);
  const [analogFinderOpen, setAnalogFinderOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState<MissionScenarioId>("moon-base");
  const [demoRunning, setDemoRunning] = useState(false);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [gisOpen, setGisOpen] = useState(false);
  const [gisLayers, setGisLayers] = useState<GISLayer[]>([]);
  const [aiSites, setAiSites] = useState<Site[]>([]);
  const [terrainBySite, setTerrainBySite] = useState<Record<string, EarthTerrainWindow>>({});
  const [terrainStatus, setTerrainStatus] = useState<Record<string, "loading" | "error">>({});

  const allSites = useMemo(() => [...catalogSites, ...aiSites], [aiSites]);
  const ranked = useMemo(() => {
    let list = allSites.filter((site) => target === "Both" || site.target === target || site.target === "Both");
    if (region !== "All regions") list = list.filter((site) => regionForSite(site) === region);
    if (kindFilter !== "All site types") list = list.filter((site) => site.kind === kindFilter);
    if (confidence !== "Any confidence") list = list.filter((site) => site.confidence === confidence);
    if (coordinateFilter === "Coordinates available") list = list.filter((site) => site.lat !== null && site.lon !== null);
    if (coordinateFilter === "Unresolved coordinates") list = list.filter((site) => site.lat === null || site.lon === null);
    if (submittedQuery.trim()) {
      const terms = submittedQuery.toLocaleLowerCase().split(/\s+/).filter((term) => term.length > 1);
      list = list.filter((site) => {
        const text = searchableText(site);
        return terms.every((term) => text.includes(term));
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "score") {
        const scoreA = calculateAnalogScore(terrainBySite[scoreKey(a.id, scoreTarget)] ?? null, scoreTarget).score ?? -1;
        const scoreB = calculateAnalogScore(terrainBySite[scoreKey(b.id, scoreTarget)] ?? null, scoreTarget).score ?? -1;
        return scoreB - scoreA;
      }
      const rowA = a.spreadsheetRow ?? -1;
      const rowB = b.spreadsheetRow ?? -1;
      if (a.origin === "excel" && b.origin === "excel") return rowA - rowB;
      return allSites.indexOf(a) - allSites.indexOf(b);
    });
  }, [allSites, target, region, kindFilter, confidence, coordinateFilter, submittedQuery, sortBy, terrainBySite, scoreTarget]);

  const selected = ranked.find((site) => site.id === selectedId) ?? allSites.find((site) => site.id === selectedId) ?? ranked[0] ?? catalogSites[0]!;
  const missionCompareSite = allSites.find((site) => site.id === missionCompareSiteId) ?? selected;
  const compared = compareIds.map((id) => allSites.find((site) => site.id === id)).filter((site): site is Site => Boolean(site));
  const activeFeatures = activeWorld === "Earth" ? [] : planetaryFeaturesFor(activeWorld);
  const selectedFeature = activeFeatures.find((feature) => feature.id === selectedFeatureId) ?? activeFeatures[0] ?? null;
  const activeGISMarkers = activeWorld === "Earth" ? [] : gisCentroidMarkers(gisLayers, activeWorld).slice(0, 300);
  const selectedScoreKey = selected ? scoreKey(selected.id, scoreTarget) : "";
  const selectedTerrain = selected ? terrainBySite[selectedScoreKey] ?? null : null;
  const selectedScore = calculateAnalogScore(selectedTerrain, scoreTarget);
  const scenario = missionScenarios.find((item) => item.id === scenarioId) ?? missionScenarios[0];
  const selectedMissionScore = calculateMissionScore(selected, selectedTerrain, scenario);
  const selectedEvidenceBand = evidenceBandForSite(selected);
  const selectedScientificAudit = auditForSite(selected);
  const workbookUnlocatedCount = catalogSites.filter((site) => site.origin === "excel" && (site.lat === null || site.lon === null)).length;

  const ui = language === "ar" ? {
    demo: "تشغيل عرض 90 ثانية", brief: "ملخص المهمة", scenario: "سيناريو المهمة", evidence: "جودة الأدلة", running: "العرض يعمل الآن",
  } : {
    demo: "Run 90-second demo", brief: "Mission brief", scenario: "Mission scenario", evidence: "Evidence quality", running: "Demo running",
  };

  useEffect(() => {
    if (!selected || selected.lat === null || selected.lon === null) return;
    const key = scoreKey(selected.id, scoreTarget);
    // Keep a failed request stable. Previously the effect re-ran after setting
    // `error`, immediately switched back to `loading`, and made the panel flicker.
    if (terrainBySite[key] || terrainStatus[key]) return;
    setTerrainStatus((current) => ({ ...current, [key]: "loading" }));
    fetchEarthTerrainWindow(selected.lat, selected.lon, scoreTarget).then((result) => {
      setTerrainBySite((current) => ({ ...current, [key]: result }));
      setTerrainStatus((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }).catch(() => {
      setTerrainStatus((current) => ({ ...current, [key]: "error" }));
    });
  }, [selected?.id, selected?.lat, selected?.lon, scoreTarget, terrainBySite, terrainStatus]);

  useEffect(() => {
    if (!demoRunning) return;
    const demoSites = allSites.filter((site) => site.lat !== null && site.lon !== null).slice(0, 6);
    if (!demoSites.length) return;
    let index = 0;
    setSelectedId(demoSites[0].id);
    const interval = window.setInterval(() => {
      index = (index + 1) % demoSites.length;
      setSelectedId(demoSites[index].id);
    }, 3500);
    const timeout = window.setTimeout(() => setDemoRunning(false), 90000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [demoRunning, allSites]);

  const changeWorld = (body: PlanetBody) => {
    setActiveWorld(body);
    setSelectedFeatureId(null);
    if (body === "Earth") setMapView("map");
    else setMapView("nasa");
  };

  const handleSearch = () => setSubmittedQuery(query.trim());
  const toggleCompare = (id: string) => setCompareIds((old) => old.includes(id) ? old.filter((item) => item !== id) : old.length < 3 ? [...old, id] : old);
  const openMissionCompare = () => { setMissionCompareSiteId(selected.id); setMissionCompareOpen(true); };
  const addAILead = (lead: Site) => {
    setAiSites((current) => current.some((site) => site.name.toLowerCase() === lead.name.toLowerCase()) ? current : [...current, lead]);
    setSelectedId(lead.id);
    setSubmittedQuery("");
  };
  const retrySelectedTerrain = () => {
    if (!selected) return;
    const key = scoreKey(selected.id, scoreTarget);
    setTerrainStatus((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const nextSort = () => setSortBy((current) => current === "catalog" ? "name" : current === "name" ? "score" : "catalog");
  const startDemo = () => {
    setTarget("Both");
    setRegion("All regions");
    setKindFilter("All site types");
    setConfidence("Any confidence");
    setCoordinateFilter("All coordinates");
    setSubmittedQuery("");
    setDemoRunning(true);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><img className="brand-logo" src={`${import.meta.env.BASE_URL}terranova-logo.jpg`} alt="TerraNova logo" /><div><div className="brand-name">TERRA<span>NOVA</span></div><div className="brand-caption">PLANETARY ANALOG DISCOVERY SYSTEM</div></div></div>
        <div className="topbar-center"><span className="live-indicator" /> NASA SPACE APPS CHALLENGE <span className="topbar-sep">/</span> FIELD RESEARCH PROTOTYPE</div>
        <div className="topbar-actions"><button className="language-toggle" onClick={() => setLanguage((value) => value === "en" ? "ar" : "en")} aria-label="Toggle interface language"><Languages size={14} /> {language === "en" ? "العربية" : "EN"}</button><button className={demoRunning ? "demo-button active" : "demo-button"} onClick={() => demoRunning ? setDemoRunning(false) : startDemo()}>{demoRunning ? <Pause size={13} /> : <Play size={13} />} {demoRunning ? ui.running : ui.demo}</button><button className="source-button" onClick={() => setSourcesOpen(true)}><Database size={15} /> Data register / المصادر <ArrowUpRight size={13} /></button></div>
      </header>

      <main className="workspace">
        <section className="main-column">
          <div className="intro-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> 2026 NASA SPACE APPS <span className="eyebrow-dot">·</span> MOON BASES & MARS</div><h1>Identify Earth locations that analog <em>permanent Moon bases and Mars.</em></h1><p className="intro-copy">Screen topography, geology, environment, and resources before a mission flies—then keep every hypothesis tied to evidence. / قارن التضاريس والجيولوجيا والبيئة والموارد قبل اختيار مواقع تشبيهية للقمر والمريخ.</p></div>
            <div className="mission-stamp"><span>MISSION</span><strong>TERRANOVA</strong><small>EARTH ↔ MOON ↔ MARS</small></div>
          </div>

          <div className="target-switch" role="tablist" aria-label="Target environment">
            <span className="switch-label">SCREENING FOR / الهدف</span>
            {targets.map((item) => <button key={item} className={target === item ? "target-tab active" : "target-tab"} onClick={() => { setTarget(item); if (item === "Moon" || item === "Mars") setScoreTarget(item); }} role="tab" aria-selected={target === item}><span className={`planet-mark planet-${item.toLowerCase()}`} />{item === "Both" ? "Cross-target / كلاهما" : `The ${item} / ${item === "Moon" ? "القمر" : "المريخ"}`}</button>)}
            <span className="switch-context">{targetCopy[target]}</span>
          </div>

          <div className="map-card">
            <div className="map-card-head"><div><span className="section-index">01</span><div><h2>Planetary atlas / الأطلس الكوكبي</h2><p>{activeWorld === "Earth" && mapView === "map" ? "MapLibre Globe · country/place labels · Esri World Imagery option" : `Official NASA ${activeWorld} glTF model · drag to rotate · wheel/pinch to zoom`}</p></div></div><div className="map-head-right"><span className="map-count"><i /> {activeWorld === "Earth" ? `${ranked.length} RECORDS` : `${activeFeatures.length} IAU FEATURES`}</span><button className={filtersOpen ? "icon-button active" : "icon-button"} aria-label="Toggle catalog filters" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={16} /></button></div></div>
            <div className="map-viewer">
              {activeWorld === "Earth" && mapView === "map" ? <Suspense fallback={<div className="planet-suspense">Loading interactive Earth map… / جارٍ تحميل الخريطة</div>}><EarthGlobeMap sites={ranked} selectedId={selected.id} onSelect={setSelectedId} onWorldChange={changeWorld} onShowNASA={() => setMapView("nasa")} gisLayers={gisLayers} /></Suspense> : <Suspense fallback={<div className="planet-suspense">Loading official NASA planetary model…</div>}><PlanetGlobe world={activeWorld} onWorldChange={changeWorld} onShowMap={() => { setActiveWorld("Earth"); setMapView("map"); }} selectedId={selected.id} visibleSites={ranked} onSelect={setSelectedId} features={activeFeatures} selectedFeatureId={selectedFeatureId} onFeatureSelect={setSelectedFeatureId} gisMarkers={activeGISMarkers} /></Suspense>}
            </div>
          </div>
          <div className="map-footer"><span><span className="foot-mark">i</span> Map imagery, NASA glTF, and scientific raster measurements are different layers. Calculated score is partial terrain screening only.</span><button onClick={() => setSourcesOpen(true)}>Methodology & sources / المنهجية <ArrowUpRight size={13} /></button></div>

          {selectedFeature && <section className="feature-register" aria-label={`${activeWorld} named feature register`}>
            <div className="feature-register-head"><div><span className="section-index">IAU</span><div><h2>{activeWorld} features / معالم {activeWorld === "Moon" ? "القمر" : "المريخ"}</h2><p>USGS Gazetteer · named-feature centers, not landing sites</p></div></div><span>{activeFeatures.length} FEATURES</span></div>
            <div className="feature-chip-list">{activeFeatures.map((feature) => <button key={feature.id} className={feature.id === selectedFeature.id ? "feature-chip active" : "feature-chip"} onClick={() => setSelectedFeatureId(feature.id)}><strong>{feature.name}</strong><span dir="rtl">{feature.nameAr}</span><small>{feature.region} · {feature.latitude.toFixed(3)}°, {feature.longitudeEast.toFixed(3)}°E</small></button>)}</div>
            <div className="feature-detail"><div><strong>{selectedFeature.name} <span dir="rtl">{selectedFeature.nameAr}</span></strong><p>{selectedFeature.region} · <span dir="rtl">{selectedFeature.regionAr}</span> · {selectedFeature.featureType}</p><small>{selectedFeature.note} Coordinate convention: {selectedFeature.coordinateConvention}.</small></div><a href={selectedFeature.sourceUrl} target="_blank" rel="noreferrer">USGS/IAU Gazetteer <ArrowUpRight size={12} /></a></div>
          </section>}

          {activeWorld !== "Earth" && activeGISMarkers.length > 0 && <div className="map-footer gis-centroid-note"><span><Layers3 size={13} /> Showing up to 300 GIS feature centroids on the {activeWorld} glTF model. Full shapes remain in the local layer register; no reprojection is performed.</span></div>}
        </section>

        <aside className="side-panel">
          <div className="side-title-row"><div><span className="section-index">02</span><div><h2>Discovery console / وحدة الاستكشاف</h2><p>{workbookAudit.totalRows} workbook rows · {allSites.filter((site) => site.lat !== null && site.lon !== null).length} display points · {workbookAudit.coreFieldCoverage}% core-field coverage</p></div></div><div className="console-status"><span /> OPEN DATA</div></div>
          <div className="data-audit-strip"><div><strong>DATA REGISTER / سجل البيانات</strong><span>{workbookAudit.totalRows} Excel rows loaded · {workbookAudit.uniqueIds} unique IDs</span></div><span className="audit-state"><i /> {scientificAuditSummary.reviewedRows}/{scientificAuditSummary.totalRecords} SCIENTIFICALLY SCREENED · {scientificAuditSummary.highRisk} HIGH-RISK RECORDS FLAGGED</span></div>

          <section className="mission-planner" aria-label="Mission scenario planner"><div className="planner-head"><div><span className="planner-kicker">{ui.scenario} / التخطيط</span><strong>Evidence-weighted decision mode</strong></div><span className="planner-pill">{scenario.target}</span></div><select value={scenarioId} onChange={(event) => setScenarioId(event.target.value as MissionScenarioId)} aria-label="Choose mission scenario">{missionScenarios.map((item) => <option value={item.id} key={item.id}>{language === "ar" ? `${item.labelAr} · ${item.shortAr}` : `${item.label} · ${item.short}`}</option>)}</select><p>Score combines terrain, evidence, coordinate defensibility, environment and access. It is a triage aid—not a landing recommendation.</p><button className="analog-finder-launch" onClick={() => setAnalogFinderOpen(true)}><Sparkles size={14} /><span>Open Analog Finder / افتح مكتشف النظائر</span><ArrowUpRight size={13} /></button></section>

          <AIScout target={target} sites={allSites} onAddLead={addAILead} />

          <div className="filter-bar"><div className="filter-label"><Filter size={13} /> REFINE / تصفية</div><button className="filter-toggle" onClick={() => setFiltersOpen((value) => !value)}>{filtersOpen ? "Hide filters" : "Show filters"}<ChevronDown size={13} className={filtersOpen ? "rotate" : ""} /></button></div>
          {filtersOpen && <div className="filter-panel">
            <label>REGION / المنطقة<select value={region} onChange={(event) => setRegion(event.target.value as RegionFilter)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>SITE TYPE / النوع<select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option>All site types</option><option>Reference analog</option><option>Exploratory candidate</option><option>AI-generated lead</option></select></label>
            <label>CONFIDENCE / الثقة<select value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceFilter)}><option>Any confidence</option><option>Context reference</option><option>Exploratory</option><option>Unverified lead</option><option>AI hypothesis</option></select></label>
            <label>COORDINATES / الإحداثيات<select value={coordinateFilter} onChange={(event) => setCoordinateFilter(event.target.value as CoordinateFilter)}><option>All coordinates</option><option>Coordinates available</option><option>Unresolved coordinates</option></select></label>
          </div>}

          <div className="catalog-search-box">
            <div className="search-control"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSearch()} placeholder="Search catalog / ابحث في السجل" /><button onClick={handleSearch} aria-label="Search local catalog"><ArrowUpRight size={17} /></button></div>
            <div className="catalog-search-hint"><CircleHelp size={11} /> Local text search only; use AI Scout above to generate new hypotheses.</div>
            {submittedQuery && <div className="query-feedback"><Search size={11} /> Showing matches for “{submittedQuery}”. <button onClick={() => { setQuery(""); setSubmittedQuery(""); }}>Clear</button></div>}
          </div>

          <div className="results-heading"><div><span className="section-index">03</span><div><h2>Field-site catalog / المواقع</h2><p>{ranked.length} visible · {target === "Both" ? "Moon + Mars" : `${target} screening`} · workbook leads remain unverified</p></div></div><button className="sort-chip" onClick={nextSort} title="Cycle catalog/name/score order"><ArrowDownUp size={12} /> {sortBy.toUpperCase()}</button></div>
          <div className="score-target-switch"><span>TERRAIN SCORE / مرجع التضاريس</span><button className={scoreTarget === "Moon" ? "active moon" : "moon"} onClick={() => setScoreTarget("Moon")}><strong>Moon</strong><small>تضاريس القمر</small></button><button className={scoreTarget === "Mars" ? "active mars" : "mars"} onClick={() => setScoreTarget("Mars")}><strong>Mars</strong><small>تضاريس المريخ</small></button></div>
          <div className="result-list">
            {ranked.map((site, index) => {
              const key = scoreKey(site.id, scoreTarget);
              const score = calculateAnalogScore(terrainBySite[key] ?? null, scoreTarget);
              const active = site.id === selected.id;
              const waiting = terrainStatus[key] === "loading";
              return <article className={`site-card ${active ? "selected" : ""}`} key={site.id} onClick={() => { setSelectedId(site.id); if (site.lat === null || site.lon === null) setActiveWorld("Earth"); }}>
                <div className="card-rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="site-card-main"><div className="site-card-top"><h3>{site.name}</h3><span className={site.kind === "Reference analog" ? "site-type reference" : site.kind === "AI-generated lead" ? "site-type ai" : "site-type candidate"}>{site.kind === "Reference analog" ? "REFERENCE" : site.kind === "AI-generated lead" ? "AI LEAD" : "CANDIDATE"}</span></div>
                  {site.nameAr && <p className="site-name-ar" dir="rtl">{site.nameAr}</p>}
                  <p className="site-location"><MapPin size={11} /> {sitePlace(site) || "Region not specified"}</p>
                  <div className="site-tags">{site.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <div className="score-track"><i style={{ width: `${score.score ?? 0}%` }} /></div>
                </div>
                <div className="site-score"><strong>{waiting ? "…" : score.score === null ? "—" : score.score}</strong><span>{score.score === null ? "NO SAMPLE" : `${score.coverage}%\nCOVERAGE`}</span><button className={compareIds.includes(site.id) ? "compare-check checked" : "compare-check"} aria-label={compareIds.includes(site.id) ? "Remove from compare" : "Add to compare"} onClick={(event) => { event.stopPropagation(); toggleCompare(site.id); }}>{compareIds.includes(site.id) ? <Check size={11} /> : "+"}</button></div>
              </article>;
            })}
            {ranked.length === 0 && <div className="empty-results"><Search size={19} /><strong>No records match these filters.</strong><button onClick={() => { setRegion("All regions"); setKindFilter("All site types"); setConfidence("Any confidence"); setCoordinateFilter("All coordinates"); setSubmittedQuery(""); setQuery(""); }}>Reset filters</button></div>}
          </div>

          <section className="selected-detail">
            <div className="detail-head"><div><span className="detail-overline">SELECTED · {selected.kind.toUpperCase()} · {selected.origin.toUpperCase()}</span><h3>{selected.name}</h3>{selected.nameAr && <p className="detail-name-ar" dir="rtl">{selected.nameAr}</p>}</div><span className="detail-score">{terrainStatus[selectedScoreKey] === "loading" ? "…" : selectedScore.score === null ? "—" : selectedScore.score}<small>{selectedScore.score === null ? "" : "%"}</small></span></div>
            <p className="detail-location"><MapPin size={12} /> {coordinateLabel(selected)} <span>·</span> {sitePlace(selected)}</p>
            <div className="site-provenance"><BadgeCheck size={12} /><span>{coordinateStatusLabel(selected)} · {selected.confidence}</span></div>
            {selected.coordinateNote && <p className="detail-description coordinate-note">{selected.coordinateNote}</p>}
            {selectedScientificAudit && <section className="scientific-audit-card" aria-label="Scientific audit status"><div className="scientific-audit-head"><div><span className="planner-kicker">SCIENTIFIC AUDIT / التدقيق العلمي</span><strong>{selectedScientificAudit.verdict.replaceAll("_", " ")}</strong></div><span className={`audit-risk ${selectedScientificAudit.risk.toLowerCase()}`}>{selectedScientificAudit.risk} RISK</span></div><div className="scientific-audit-stats"><span><b>{selectedScientificAudit.confidence}</b> confidence</span><span><b>{selectedScientificAudit.sources.length}</b> sources</span><span><b>{selectedScientificAudit.supported_claims.length}</b> supported</span><span><b>{selectedScientificAudit.unverifiable_claims.length}</b> unresolved</span></div>{selectedScientificAudit.corrections.length > 0 && <p><strong>Before publication:</strong> {selectedScientificAudit.corrections[0]}</p>}<small>Exploratory evidence only · not a landing-site or base-suitability recommendation.</small></section>}
            <p className="detail-description">{selected.description}</p>
            {selected.why && <div className="score-explainer"><Activity size={13} /><span>{selected.why}</span></div>}
            <div className="selected-score-box"><div className="selected-score-head"><strong>ANALOG MATCH · TERRAIN ONLY</strong><span>{scoreTarget} reference</span></div><div className="selected-score-value">{selectedScore.score === null ? "—" : `${selectedScore.score}%`} <small>coverage {selectedScore.coverage}%</small></div><p>{selectedScore.interpretation}</p>{terrainStatus[selectedScoreKey] === "loading" && <small className="terrain-status">Sampling ASTER GDEM · 9 regional centres…</small>}{terrainStatus[selectedScoreKey] === "error" && <button className="retry-terrain" onClick={retrySelectedTerrain}>ASTER sample unavailable · retry</button>}{selected.lat === null || selected.lon === null ? <small className="terrain-status">No coordinate means no remote terrain sample and no score.</small> : null}</div>
            <section className="evidence-card"><div className="evidence-card-head"><div><span className="planner-kicker">{ui.evidence}</span><strong>{evidenceLabel(selectedEvidenceBand)}</strong></div><span className={`evidence-dot ${selectedEvidenceBand}`} /></div><p>{selectedMissionScore.caveat}</p><div className="decision-score"><div><span>{scenario.short} / {scenario.shortAr}</span><strong>{selectedMissionScore.score}<small>/100</small></strong></div><div className="decision-bar"><i style={{ width: `${selectedMissionScore.score}%` }} /></div></div><div className="evidence-factors"><span>Terrain <b>{selectedMissionScore.terrainScore}</b></span><span>Evidence <b>{selectedMissionScore.evidence}</b></span><span>Coordinates <b>{selectedMissionScore.coordinate}</b></span><span>Environment <b>{selectedMissionScore.environment}</b></span><span>Access <b>{selectedMissionScore.access}</b></span></div><div className="evidence-actions"><button onClick={() => setMissionBriefOpen(true)}><FileText size={13} /> {ui.brief}</button><span>Strongest factor: {selectedMissionScore.strongest}</span></div></section>
            <div className="detail-tags" aria-label="Site tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <NasaClimateSnapshot site={selected} />
            {selected.sourceFields && Object.keys(selected.sourceFields).some((key) => selected.sourceFields?.[key]) && <details className="original-fields"><summary>Original Excel fields / حقول الملف الأصلية {selected.spreadsheetRow ? `· row ${selected.spreadsheetRow}` : ""}</summary><dl>{Object.entries(selected.sourceFields).filter(([, value]) => value?.trim()).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details>}
            {selected.sources?.length ? <div className="detail-source-links">{selected.sources.map((source) => <a href={source.url} key={`${source.label}-${source.url}`} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={11} /></a>)}</div> : selected.origin === "excel" ? <div className="detail-source-links"><span>Source: user-supplied Excel · per-site scientific citations were not present in the workbook.</span></div> : null}
            <button className="planet-compare-launch" onClick={openMissionCompare}><ArrowLeftRight size={15} /><span>Compare measured data with Moon / Mars · قارن البيانات</span><ArrowUpRight size={13} /></button>
            <div className="detail-bottom"><span><BadgeCheck size={13} /> {selected.confidence} · {selected.coordinateStatus ?? "coordinate status not listed"}</span><button onClick={() => setSourcesOpen(true)}>SOURCES / المصادر <ArrowUpRight size={12} /></button></div>
          </section>

          <div className="tools-toggle-row"><button className={gisOpen ? "tools-toggle active" : "tools-toggle"} onClick={() => setGisOpen((value) => !value)}><Layers3 size={14} /> GIS import / رفع GIS <span>{gisLayers.length}</span></button><button className="tools-toggle" onClick={() => setSourcesOpen(true)}><Database size={14} /> NASA data register</button></div>
          {gisOpen && <><Suspense fallback={<div className="planet-suspense">Loading GIS tools… / جارٍ تحميل أدوات GIS</div>}><GISImport body={activeWorld} scoreTarget={scoreTarget} layers={gisLayers} onLayerAdd={(layer) => setGisLayers((current) => [...current, layer])} onLayerVisibility={(id) => setGisLayers((current) => current.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer))} onLayerRemove={(id) => setGisLayers((current) => current.filter((layer) => layer.id !== id))} /></Suspense><p className="gis-overlay-hint">Earth layers display their geometries on the map. Moon/Mars 3D models show representative centroids only. Session-local; no automatic upload.</p></>}

          {compareIds.length > 0 && <div className="compare-bar"><span><BarChart3 size={15} /> {compareIds.length} / 3 records selected</span><button disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>Compare records <ArrowUpRight size={13} /></button><button className="clear-compare" onClick={() => setCompareIds([])} aria-label="Clear comparison"><X size={15} /></button></div>}
        </aside>
      </main>

      <footer className="bottom-bar"><span><strong>TERRANOVA</strong> <i /> A research prototype for NASA Space Apps Challenge · نموذج بحثي أولي</span><span>NASA CMR METADATA <i /> CALCULATED TERRAIN SCORE <i /> <button onClick={() => setSourcesOpen(true)}>METHODOLOGY & SOURCES</button></span></footer>

      {sourcesOpen && <div className="modal-backdrop" onClick={() => setSourcesOpen(false)}><section className="modal-card sources-modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-index">DATA REGISTER / سجل البيانات</span><h2>NASA sources & methodology / المصادر والمنهجية</h2></div><button className="icon-button" onClick={() => setSourcesOpen(false)} aria-label="Close"><X size={17} /></button></div>
        <div className="modal-warning"><Activity size={16} /><p><strong>Scientific screening notice / تنبيه منهجي</strong><br />The imported Excel rows are user-provided leads; {workbookUnlocatedCount} of {catalogSites.filter((site) => site.origin === "excel").length} still have no defensible map point. Other pins may be representative or approximate and do not define site boundaries. Broad regions and multi-site records are not assigned invented centroids. AI Scout output is a hypothesis—not a confirmed analogue, new scientific discovery, or landing/base suitability assessment.</p></div>
        <p className="modal-copy">Earth collection metadata is queried live from NASA CMR. ASTER sampling, NASA POWER climatology, LOLA Site04 and MOLA Jezero remain separate datasets with different spatial resolution, time windows and measurement conventions. NASA glTF models are visual references only.</p>
        <div className="method-note"><strong>Analog Match Score / خوارزمية التطابق</strong><p>The score is a weighted similarity of available terrain factors only. Slope: `max(0, 100 × (1 − |Δ slope| / 20°))`, weight 0.60. Regional relief, when available on a comparable spatial support: `max(0, 100 × (1 − |ln((R_E+1)/(R_P+1))| / ln(4))`, weight 0.40. Available weights are renormalized; `coverage` reports the fraction of original weight present. Moon uses 9 sparse ASTER sample centres in a 5×5 km window vs a dense LOLA 5×5 km raster; Mars uses an approximately 11×11 km ASTER window vs coarse 3×3 MOLA cells. No climate, mineral-resource, logistics, safety, or engineering suitability is inferred. / الدرجة فحص تضاريسي أولي فقط.</p></div>
        <Suspense fallback={<div className="planet-suspense">Loading NASA collection search…</div>}><NasaEarthCatalog /></Suspense>
        <div className="source-list">{planetarySources.map((source, index) => <a className="source-resource" href={source.url} target="_blank" rel="noreferrer" key={source.label}><span className="source-resource-group">{source.group} · {String(index + 1).padStart(2, "0")}</span><span><strong>{source.label}</strong><small>{source.description}</small></span><ArrowUpRight size={15} /></a>)}</div>
        <div className="method-note"><strong>Coordinate and GIS policy</strong><p>User spreadsheets preserve their raw fields and source descriptions. Coordinates are source-labelled as verified, representative, approximate, or unresolved. GIS files are processed in browser memory only; geometry is never sent to the AI Scout. Earth map tiles are from OpenFreeMap/OpenStreetMap with optional Esri World Imagery and visible attribution. / تُحفظ قيود الإحداثيات ومصدر كل طبقة بوضوح.</p></div>
        <button className="modal-close" onClick={() => setSourcesOpen(false)}>Back to atlas / عودة للأطلس</button></section></div>}

      {missionBriefOpen && <div className="modal-backdrop" onClick={() => setMissionBriefOpen(false)}><section className="modal-card mission-brief" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-index">MISSION BRIEF / ملخص المهمة</span><h2>{selected.name}</h2></div><button className="icon-button" onClick={() => setMissionBriefOpen(false)} aria-label="Close"><X size={17} /></button></div><div className="brief-hero"><img src={`${import.meta.env.BASE_URL}terranova-logo.jpg`} alt="TerraNova" /><div><strong>{scenario.label}</strong><span>{scenario.labelAr} · evidence-weighted triage</span></div><b>{selectedMissionScore.score}<small>/100</small></b></div><div className="brief-grid"><div><span>LOCATION</span><strong>{sitePlace(selected)}</strong><small>{coordinateLabel(selected)}</small></div><div><span>EVIDENCE</span><strong>{evidenceLabel(selectedEvidenceBand)}</strong><small>{selected.confidence}</small></div><div><span>TARGET</span><strong>{scenario.target}</strong><small>{selected.target} analogue context</small></div><div><span>LEAD STATUS</span><strong>{selected.kind}</strong><small>{selected.origin === "excel" ? "User-supplied workbook" : "Curated reference"}</small></div></div><div className="brief-section"><strong>Decision note / ملاحظة القرار</strong><p>{selectedMissionScore.caveat}</p><p>{selected.why}</p></div><div className="brief-section"><strong>Limits / القيود</strong><p>This is an Earth analogue hypothesis and a screening aid. It is not a landing-site recommendation, engineering assessment, or proof of resource availability.</p></div><div className="brief-actions"><button className="modal-close" onClick={() => window.print()}><Download size={14} /> Print / Save PDF</button><button className="modal-close secondary" onClick={() => setMissionBriefOpen(false)}>Back to atlas / عودة للأطلس</button></div></section></div>}
      {analogFinderOpen && <AnalogFinder sites={allSites} selectedId={selected.id} onSelect={(id) => { setSelectedId(id); setAnalogFinderOpen(false); }} onClose={() => setAnalogFinderOpen(false)} />}
      {missionCompareOpen && <Suspense fallback={<div className="planet-suspense">Loading measured comparison…</div>}><MissionComparator site={missionCompareSite} sites={allSites} onSiteChange={setMissionCompareSiteId} onClose={() => setMissionCompareOpen(false)} /></Suspense>}

      {compareOpen && compared.length > 0 && <div className="modal-backdrop" onClick={() => setCompareOpen(false)}><section className="modal-card compare-modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-index">SIDE-BY-SIDE / مقارنة جانبية</span><h2>Compare field records / قارن المواقع</h2></div><button className="icon-button" onClick={() => setCompareOpen(false)} aria-label="Close"><X size={17} /></button></div><p className="compare-disclaimer">Raw source fields and coordinate confidence only · no illustrative profile indices.</p><div className="comparison-table"><div className="comparison-row comparison-label-row"><span>FIELD</span>{compared.map((site) => <strong key={site.id}>{site.name}</strong>)}</div>{([["Target", (site: Site) => site.target], ["Region", (site: Site) => sitePlace(site)], ["Coordinates", coordinateLabel], ["Coordinate status", coordinateStatusLabel], ["Geology", (site: Site) => site.geology || site.analogCategory || "Not reported"], ["Environment", (site: Site) => site.environment || site.tags.join(" · ") || "Not reported"], ["Mission applications", (site: Site) => site.missionApplications || site.goalFeature || "Not reported"], ["Source confidence", (site: Site) => site.confidence]] as [string, (site: Site) => string][]).map(([label, value]) => <div className="comparison-row" key={label}><span>{label}</span>{compared.map((site) => <b key={site.id}>{value(site)}</b>)}</div>)}</div><button className="modal-close" onClick={() => setCompareOpen(false)}>Close comparison / إغلاق</button></section></div>}
    </div>
  );
}

export default Home;
