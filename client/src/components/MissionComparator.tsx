import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowUpRight, Database, Globe2, Layers3, MapPin, Mountain, Thermometer, X } from "lucide-react";
import type { Site } from "@/data/sites";
import NasaClimateSnapshot from "@/components/NasaClimateSnapshot";
import { calculateAnalogScore, type AnalogTargetBody } from "@/data/analogScore";
import { fetchEarthTerrainWindow, type EarthTerrainWindow } from "@/data/earthTerrain";
import {
  earthTopographyMetadata,
  fetchLatestMarsWeather,
  lunarDiviner,
  lunarSite04,
  marsJezero,
  topographyForSite,
  type MarsWeatherObservation,
} from "@/data/planetaryProfiles";
import "@/planet-comparator.css";

type MissionComparatorProps = {
  site: Site;
  sites: Site[];
  onSiteChange: (siteId: string) => void;
  onClose: () => void;
};

type TerrainState = "loading" | "ready" | "error" | "no-coordinates";

function signed(value: number, digits = 0) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

function sitePlace(site: Site) {
  return [site.location.trim(), site.country.trim()].filter(Boolean).join(", ");
}

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function MissionComparator({ site, sites, onSiteChange, onClose }: MissionComparatorProps) {
  const [body, setBody] = useState<AnalogTargetBody>("Moon");
  const [weather, setWeather] = useState<MarsWeatherObservation | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [terrain, setTerrain] = useState<EarthTerrainWindow | null>(null);
  const [terrainState, setTerrainState] = useState<TerrainState>("loading");
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (body !== "Mars") return;
    const controller = new AbortController();
    setWeatherLoading(true);
    fetchLatestMarsWeather(controller.signal).then(setWeather).finally(() => setWeatherLoading(false));
    return () => controller.abort();
  }, [body]);

  useEffect(() => {
    let active = true;
    if (site.lat === null || site.lon === null) {
      setTerrain(null);
      setTerrainState("no-coordinates");
      return () => { active = false; };
    }
    setTerrain(null);
    setTerrainState("loading");
    fetchEarthTerrainWindow(site.lat, site.lon, body).then((result) => {
      if (!active) return;
      setTerrain(result);
      setTerrainState("ready");
    }).catch(() => {
      if (!active) return;
      setTerrain(null);
      setTerrainState("error");
    });
    return () => { active = false; };
  }, [site.id, site.lat, site.lon, body, retry]);

  const point = topographyForSite(site);
  const score = calculateAnalogScore(terrain, body);
  const sampledElevation = terrain ? median(terrain.elevationSamplesM) : null;
  const earthCoordinateText = site.lat === null || site.lon === null
    ? "No coordinate available · no sample requested"
    : `${site.lat.toFixed(4)}°, ${site.lon.toFixed(4)}° · ${site.coordinateStatus ?? "coordinate status not documented"}`;
  const closeIfBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) closeRef.current();
  };

  return (
    <div className="planet-compare-backdrop" onMouseDown={closeIfBackdrop} role="presentation">
      <div className="planet-compare-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="planet-compare-title" aria-describedby="planet-compare-description">
        <header className="planet-compare-header">
          <div className="planet-compare-title-wrap">
            <span className="planet-compare-overline"><ArrowLeftRight size={13} /> PLANETARY DATA COMPARISON / مقارنة الكواكب</span>
            <h2>Earth <i>↔</i> {body}</h2>
            <p id="planet-compare-description">Measured reference layers and a transparent, partial terrain-screening score / قياسات منفصلة ودرجة تضاريس جزئية.</p>
          </div>
          <button className="planet-compare-close" onClick={() => closeRef.current()} aria-label="Close comparison"><X size={18} /></button>
        </header>

        <div className="planet-compare-toolbar">
          <label className="planet-compare-site-select"><span><MapPin size={13} /> EARTH FIELD SITE / موقع الأرض</span>
            <select value={site.id} onChange={(event) => onSiteChange(event.target.value)} aria-label="Choose Earth field site">
              {sites.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.country}</option>)}
            </select>
          </label>
          <div className="planet-compare-target" role="group" aria-label="Choose planetary reference">
            <span>COMPARE TO / قارن مع</span>
            <button className={body === "Moon" ? "active moon" : "moon"} onClick={() => setBody("Moon")} aria-pressed={body === "Moon"}><i /> Moon · south pole</button>
            <button className={body === "Mars" ? "active mars" : "mars"} onClick={() => setBody("Mars")} aria-pressed={body === "Mars"}><i /> Mars · Jezero</button>
          </div>
        </div>

        <div className="planet-compare-grid">
          <section className="planet-profile earth-profile" aria-label={`Earth data for ${site.name}`}>
            <div className="planet-profile-head"><div className="planet-profile-icon"><Globe2 size={17} /></div><div><span>EARTH · {site.coordinateStatus?.toUpperCase() ?? "COORDINATE STATUS NOT LISTED"}</span><h3>{site.name}</h3><p>{sitePlace(site) || "Region not specified"} · {earthCoordinateText}</p></div></div>
            <div className="planet-profile-section"><div className="planet-profile-section-title"><Layers3 size={14} /><h4>Regional topography</h4><span>ASTER GDEM V003</span></div>
              {terrain ? <>
                <div className="planet-metric-pair">
                  <div className="planet-metric-card"><span>Median elevation · 9 centres</span><strong>{sampledElevation === null ? "—" : signed(sampledElevation)} <small>m</small></strong><em>{terrain.samplesUsed}/9 local windows</em></div>
                  <div className="planet-metric-card"><span>Median local slope</span><strong>{terrain.medianSlopeDeg.toFixed(2)}<small>°</small></strong><em>Four-neighbour estimate</em></div>
                </div>
                <div className="planet-stat-row"><span>Regional relief · P90−P10</span><strong>{terrain.reliefP90P10M === null ? "Not available" : `${terrain.reliefP90P10M.toFixed(1)} m`}</strong></div>
                <p className="planet-data-meta">Sparse 9-centre ASTER sample over approximately {terrain.supportWidthKm} × {terrain.supportWidthKm} km · {terrain.dataset} · 30 m posting at the equator.</p>
              </> : point ? <div className="planet-metric-pair"><div className="planet-metric-card"><span>Stored point elevation</span><strong>{signed(point.elevationM)} <small>m</small></strong><em>approximate map pin</em></div><div className="planet-metric-card"><span>Stored point slope</span><strong>{point.slopeDeg.toFixed(2)}<small>°</small></strong><em>4-neighbour estimate</em></div></div> : <p className="planet-data-meta">{terrainState === "loading" ? "Sampling ASTER around the map pin…" : terrainState === "no-coordinates" ? "No verified coordinate is available, so no remote ASTER request was made." : <><span>ASTER sampling failed or returned too few valid points. </span><button className="terrain-retry-inline" onClick={() => setRetry((value) => value + 1)}>Retry sample</button></>}</p>}
              {terrainState === "loading" && <div className="mars-weather-state"><i />Sampling NASA/METI ASTER · 9 centres</div>}
              <p className="planet-data-meta">{earthTopographyMetadata.resolution} · {earthTopographyMetadata.horizontalReference}/{earthTopographyMetadata.verticalReference}<br />Acquisition inputs: {earthTopographyMetadata.temporalExtent}. {terrain?.source ?? "Point samples are approximate map-pin context."}</p>
              <div className="planet-source-links"><a href={earthTopographyMetadata.sourceUrl} target="_blank" rel="noreferrer">NASA Earthdata product <ArrowUpRight size={11} /></a><a href={earthTopographyMetadata.providerUrl} target="_blank" rel="noreferrer">Point-sample service <ArrowUpRight size={11} /></a></div>
            </div>
            <div className="planet-profile-section climate-section"><div className="planet-profile-section-title"><Thermometer size={14} /><h4>Climate</h4><span>NASA POWER · MERRA-2</span></div>
              <NasaClimateSnapshot site={site} compact />
              <p className="planet-data-meta">T2M is 2 m air temperature; precipitation is an average daily rate. NASA POWER is gridded reanalysis, not a field station; it is not included in the terrain score.</p>
            </div>
          </section>

          {body === "Moon" ? <section className="planet-profile moon-profile" aria-label="Lunar south-polar reference data">
            <div className="planet-profile-head"><div className="planet-profile-icon"><span className="moon-icon" /></div><div><span>MOON · SOUTH-POLAR REFERENCE</span><h3>{lunarSite04.label}</h3><p>LOLA Site04 · local 5 × 5 km window</p></div></div>
            <div className="planet-profile-section"><div className="planet-profile-section-title"><Mountain size={14} /><h4>Topography</h4><span>NASA LOLA · 5 m/px</span></div>
              <div className="planet-stat-row"><span>Elevation · P10 / median / P90</span><strong>{signed(lunarSite04.elevationP10M)} / {signed(lunarSite04.elevationMedianM)} / {signed(lunarSite04.elevationP90M)} m</strong></div>
              <div className="planet-stat-row"><span>Slope · P10 / median / P90</span><strong>{lunarSite04.slopeP10Deg.toFixed(1)} / {lunarSite04.slopeMedianDeg.toFixed(1)} / {lunarSite04.slopeP90Deg.toFixed(1)}°</strong></div>
              <p className="planet-data-meta">{lunarSite04.window} · {lunarSite04.cellsSampled.toLocaleString("en-US")} cells. Height relative to a {lunarSite04.referenceRadiusM.toLocaleString("en-US")} m lunar reference sphere. About {lunarSite04.interpolatedPercent}% of 5 m pixels are interpolated; NASA reports median RMS uncertainties of {lunarSite04.medianRmsHeightErrorM} m in height and {lunarSite04.medianRmsSlopeErrorDeg}° in slope.</p>
              <a className="planet-source-single" href={lunarSite04.sourceUrl} target="_blank" rel="noreferrer">NASA LOLA Site04 data & uncertainty <ArrowUpRight size={11} /></a>
            </div>
            <div className="planet-profile-section climate-section"><div className="planet-profile-section-title"><Thermometer size={14} /><h4>Thermal environment</h4><span>NASA LRO · DIVINER</span></div>
              <div className="planet-thermal-summary"><span>Bolometric brightness temperature · P10 / median / P90</span><strong>{lunarDiviner.p10K.toFixed(1)} / {lunarDiviner.medianK.toFixed(1)} / {lunarDiviner.p90K.toFixed(1)} <small>K</small></strong></div>
              <p className="planet-data-meta">{lunarDiviner.validRecords} valid records within {lunarDiviner.statisticRadiusKm} km of {Math.abs(lunarDiviner.centerLatitude).toFixed(4)}°S, {Math.abs(lunarDiviner.centerLongitude).toFixed(4)}°W · {lunarDiviner.productBin} · {lunarDiviner.period}. Local time {lunarDiviner.localTimeMinHours.toFixed(1)}–{lunarDiviner.localTimeMaxHours.toFixed(1)} h; observed range {lunarDiviner.observedMinK.toFixed(1)}–{lunarDiviner.observedMaxK.toFixed(1)} K.</p>
              <p className="planet-caveat">Diviner measures surface thermal emission, not air temperature; this selected seasonal product bin is not an annual climate average.</p>
              <a className="planet-source-single" href={lunarDiviner.sourceUrl} target="_blank" rel="noreferrer">NASA PDS Diviner archive <ArrowUpRight size={11} /></a>
            </div>
          </section> : <section className="planet-profile mars-profile" aria-label="Mars Jezero reference data">
            <div className="planet-profile-head"><div className="planet-profile-icon"><span className="mars-icon" /></div><div><span>MARS · PERSEVERANCE REFERENCE</span><h3>{marsJezero.label}</h3><p>{marsJezero.latitude.toFixed(4)}°N, {marsJezero.longitudeEast.toFixed(4)}°E · rover landing region</p></div></div>
            <div className="planet-profile-section"><div className="planet-profile-section-title"><Mountain size={14} /><h4>Topography</h4><span>MOLA · MEGDR</span></div>
              <div className="planet-metric-pair">
                <div className="planet-metric-card"><span>Elevation at cell</span><strong>{signed(marsJezero.elevationM)} <small>m</small></strong><em>relative to Mars areoid</em></div>
                <div className="planet-metric-card"><span>Local slope estimate</span><strong>{marsJezero.localSlopeDeg.toFixed(2)}<small>°</small></strong><em>3 × 3 MOLA cells</em></div>
              </div>
              <p className="planet-data-meta">{marsJezero.resolution}. Local comparison uses {marsJezero.localNeighborhood}; each cell is several kilometres, not a landing-hazard-scale map.</p>
              <a className="planet-source-single" href={marsJezero.sourceUrl} target="_blank" rel="noreferrer">NASA PDS MOLA product & areoid <ArrowUpRight size={11} /></a>
            </div>
            <div className="planet-profile-section climate-section"><div className="planet-profile-section-title"><Thermometer size={14} /><h4>Weather archive</h4><span>NASA MARS 2020</span></div>
              {weatherLoading && <div className="mars-weather-state"><i />Checking latest available NASA weather record…</div>}
              {weather && <>
                <div className="planet-metric-pair">
                  <div className="planet-metric-card"><span>Daily air-temperature range</span><strong>{weather.minimumC.toFixed(1)}–{weather.maximumC.toFixed(1)} <small>°C</small></strong><em>{weather.season} · sol {weather.sol}</em></div>
                  <div className="planet-metric-card"><span>Surface pressure</span><strong>{weather.pressurePa === null ? "—" : weather.pressurePa.toFixed(1)} <small>Pa</small></strong><em>reported {weather.terrestrialDate}</em></div>
                </div>
                <p className="planet-data-meta">NASA’s latest complete Mars 2020 weather-feed record available: {weather.terrestrialDate}. This is a single archived daily report, not a long-term Mars climate normal. Status: {weather.status}.</p>
              </>}
              <a className="planet-source-single" href="https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json" target="_blank" rel="noreferrer">NASA Mars 2020 weather feed <ArrowUpRight size={11} /></a>
            </div>
          </section>}
        </div>

        <section className="planet-score-card" aria-label="Calculated terrain analog match score">
          <div className="planet-score-heading"><div><span><Database size={13} /> CALCULATED TERRAIN SCREENING / درجة تشابه تضاريس</span><h3>Analog Match Score · {body}</h3></div><strong>{score.score === null ? "—" : `${score.score}%`}</strong></div>
          <div className="planet-score-meta"><span>Data coverage <b>{score.coverage}%</b></span><span>{score.factors.length} / 2 factors available</span><span>{terrainState === "loading" ? "ASTER sample loading…" : terrainState === "error" ? "ASTER sample unavailable" : terrainState === "no-coordinates" ? "No coordinate" : terrain ? `${terrain.samplesUsed}/9 ASTER neighbourhoods` : "No terrain sample"}</span></div>
          <div className="planet-score-factors">{score.factors.map((factor) => <div className="planet-score-factor" key={factor.id}><div><strong>{factor.label}</strong><span>{factor.weight * 100}% weight · {factor.similarity.toFixed(0)}% similar</span></div><p>Earth {factor.earthValue.toFixed(factor.unit === "°" ? 2 : 1)} {factor.unit} · {body} {factor.referenceValue.toFixed(factor.unit === "°" ? 2 : 1)} {factor.unit}</p><small>{factor.method}</small></div>)}{score.factors.length === 0 && <p className="planet-score-empty">No comparable Earth terrain factor available; score is not calculated. / لا توجد عينة تضاريس قابلة للمقارنة.</p>}</div>
          <p className="planet-score-caveat">{score.interpretation} This is not a climate, geology, engineering, safety, or landing/base suitability score. Similarity depends on sparse Earth samples and mismatched sensor resolution.</p>
        </section>

        <footer className="planet-compare-footer"><div><Database size={14} /><p><strong>Transparent partial score—not overall suitability.</strong> The 0.60 slope and 0.40 compatible-relief weights are renormalized over available factors; coverage is separate. Earth ASTER samples, lunar LOLA raster and Mars MOLA cells differ in resolution and instrument. Scores are a first-pass research filter only and are not a safety assessment.</p></div><button onClick={() => closeRef.current()}>Return to atlas <ArrowUpRight size={13} /></button></footer>
      </div>
    </div>
  );
}

export default MissionComparator;
