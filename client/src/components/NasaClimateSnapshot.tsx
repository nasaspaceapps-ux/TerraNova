import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, ChevronDown, RotateCcw } from "lucide-react";
import type { Site } from "@/data/sites";
import { fetchNasaPowerClimatology, NASA_POWER_DOCS, powerMonths, type ClimateSnapshot } from "@/data/nasaPower";
import "@/nasa-climate.css";

const monthLabels: Record<(typeof powerMonths)[number], string> = {
  JAN: "Jan", FEB: "Feb", MAR: "Mar", APR: "Apr", MAY: "May", JUN: "Jun",
  JUL: "Jul", AUG: "Aug", SEP: "Sep", OCT: "Oct", NOV: "Nov", DEC: "Dec",
};

type LoadState = "loading" | "ready" | "error" | "no-coordinates";

function format(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

type NasaClimateSnapshotProps = { site: Site; compact?: boolean };

function NasaClimateSnapshot({ site, compact = false }: NasaClimateSnapshotProps) {
  const [data, setData] = useState<ClimateSnapshot | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    if (site.lat === null || site.lon === null) {
      setData(null);
      setState("no-coordinates");
      setExpanded(false);
      return () => { current = false; };
    }
    setState("loading");
    setData(null);
    setExpanded(false);
    fetchNasaPowerClimatology(site.lat, site.lon).then((snapshot) => {
      if (!current) return;
      setData(snapshot);
      setState("ready");
    }).catch(() => {
      if (!current) return;
      setState("error");
    });
    return () => { current = false; };
  }, [site.id, site.lat, site.lon, retry]);

  const coordinateLabel = site.lat !== null && site.lon !== null
    ? `${site.lat.toFixed(2)} degrees latitude, ${site.lon.toFixed(2)} degrees longitude`
    : "unlocated site";

  const monthlyRange = useMemo(() => {
    if (!data) return { min: 0, max: 1 };
    const values = powerMonths.map((month) => data.temperatureByMonth[month]).filter((value): value is number => value !== null);
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [data]);

  return (
    <section className="power-snapshot" aria-label={`NASA POWER historical climate for ${site.name}`}>
      <div className={compact ? "power-header power-header-compact" : "power-header"}>
        {!compact && <div><Activity size={13} /><span>NASA POWER · MERRA-2</span></div>}
        <span className={`power-state-pill ${state}`}>{state === "loading" ? "LOADING" : state === "ready" ? "LIVE" : "UNAVAILABLE"}</span>
      </div>
      {state === "loading" && <div className="power-loading"><i />Loading the point climatology…</div>}
      {state === "no-coordinates" && <div className="power-error"><span>No verified coordinate is available. NASA POWER cannot be sampled for this lead yet.</span></div>}
      {state === "error" && <div className="power-error"><span>NASA POWER could not return this point right now.</span><button onClick={() => setRetry((value) => value + 1)}><RotateCcw size={11} /> Retry</button></div>}
      {state === "ready" && data && <>
        <div className="power-values">
          <div><span>Annual mean · T2M</span><strong>{format(data.temperatureAnnual)}<small>{data.temperatureUnit}</small></strong></div>
          <div><span>Corrected precipitation · annual mean</span><strong>{format(data.precipitationAnnual, 2)}<small>{data.precipitationUnit}</small></strong></div>
        </div>
        <div className="power-period">{data.period} · {data.source}</div>
        <button className="power-expand" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          Monthly temperature profile <ChevronDown size={13} className={expanded ? "expanded" : ""} />
        </button>
        {expanded && <div className="power-monthly" role="img" aria-label={`NASA POWER monthly mean temperature profile at ${coordinateLabel}`}>
          <div className="power-chart-label">T2M monthly mean · °C</div>
          <div className="power-bars">{powerMonths.map((month) => {
            const value = data.temperatureByMonth[month];
            const span = monthlyRange.max - monthlyRange.min;
            const height = value === null ? 3 : 8 + ((value - monthlyRange.min) / (span || 1)) * 28;
            const precipitation = data.precipitationByMonth[month];
            return <div className="power-month" key={month} title={`${monthLabels[month]}: ${format(value)} °C; precipitation ${format(precipitation, 2)} mm/day`}>
              <i style={{ height: `${height}px` }} /><span>{monthLabels[month][0]}</span>
            </div>;
          })}</div>
          <div className="power-chart-range"><span>{format(monthlyRange.min)}°</span><span>{format(monthlyRange.max)}°</span></div>
        </div>}
        <p className="power-caveat">At the approximate map-pin coordinates · gridded MERRA-2 reanalysis, not a field measurement. Climate is displayed separately and is not included in the current terrain-only score.</p>
      </>}
      <a className="power-source-link" href={NASA_POWER_DOCS} target="_blank" rel="noreferrer">NASA POWER source & method <ArrowUpRight size={11} /></a>
    </section>
  );
}

export default NasaClimateSnapshot;
