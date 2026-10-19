import { useEffect, useState } from "react";
import { ArrowUpRight, Radio } from "lucide-react";
import { fetchEarthDataCollections, type LiveEarthProduct } from "@/data/nasaSources";

function NasaEarthCatalog() {
  const [records, setRecords] = useState<LiveEarthProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchEarthDataCollections(controller.signal).then(setRecords).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <section className="cmr-catalog" aria-label="Live NASA Earthdata collections">
      <div className="cmr-heading"><div><Radio size={14} /><strong>NASA EARTHDATA · LIVE CMR</strong></div><span className={loading ? "cmr-status loading" : "cmr-status"}>{loading ? "CONNECTING" : "CATALOG CHECKED"}</span></div>
      <p className="cmr-intro">Collection metadata is queried from NASA’s Common Metadata Repository. This is not a per-site pixel sample.</p>
      {loading ? <div className="cmr-loading"><i />Reading SRTMGL1 and MOD11A1 collection records…</div> : <div className="cmr-records">{records.map((record) => <article className="cmr-record" key={record.shortName}>
        <div className="cmr-record-top"><strong>{record.title}</strong><span className={record.status === "live" ? "cmr-live-pill" : "cmr-fallback-pill"}>{record.status === "live" ? "LIVE" : "SOURCE LINK"}</span></div>
        <p>{record.shortName} · v{record.version} · {record.resolution}</p>
        <p>{record.coverage} · {record.period}</p>
        <small>CMR {record.conceptId} · DOI {record.doi}</small>
        <a href={record.landingPage} target="_blank" rel="noreferrer">Open official Earthdata record <ArrowUpRight size={12} /></a>
      </article>)}</div>}
      <p className="cmr-caveat">MOD11A1 is land-surface temperature, not air temperature. SRTM does not cover the polar regions; use other elevation products there.</p>
    </section>
  );
}

export default NasaEarthCatalog;
