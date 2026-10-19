import { useState } from "react";
import { ArrowUpRight, Check, LoaderCircle, Plus, Search, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Site, Target } from "@/data/sites";
import "@/terra-tools.css";

type Props = {
  target: Target;
  sites: Site[];
  onAddLead: (site: Site) => void;
};

type ScoutCandidate = {
  name: string;
  location: string;
  country: string;
  target: Target;
  environment: string;
  rationale: string;
  signals: string[];
  validationSteps: string[];
  latitude: number | null;
  longitude: number | null;
};

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "lead";
}

function AIScout({ target, sites, onAddLead }: Props) {
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const scout = trpc.terraNova.scout.useMutation();

  const runScout = () => {
    if (query.trim().length < 6 || scout.isPending) return;
    scout.reset();
    setAdded([]);
    scout.mutate({
      query: query.trim(),
      target,
      knownSites: sites.slice(0, 100).map((site) => ({ name: site.name, country: site.country, location: site.location })),
    });
  };

  const addCandidate = (candidate: ScoutCandidate, index: number) => {
    const id = `ai-${slug(candidate.name)}-${Date.now().toString(36)}-${index}`;
    const lead: Site = {
      id,
      name: candidate.name,
      location: candidate.location,
      country: candidate.country,
      lat: null,
      lon: null,
      target: candidate.target,
      kind: "AI-generated lead",
      confidence: "AI hypothesis",
      origin: "ai",
      tags: [...candidate.signals, candidate.environment].slice(0, 6),
      description: candidate.rationale,
      why: `Validation needed: ${candidate.validationSteps.join(" · ")}`,
      sourceLabel: "TerraNova AI Scout · hypothesis, not evidence",
      coordinateStatus: "unresolved",
      coordinateNote: "AI Scout does not assign coordinates. Verify a representative point independently or load a GIS layer.",
      temporary: true,
      aiGenerated: true,
    };
    onAddLead(lead);
    setAdded((current) => [...current, candidate.name]);
  };

  return (
    <section className="terra-tools-card ai-scout-card" aria-labelledby="ai-scout-title">
      <header className="terra-tools-header">
        <div className="terra-tools-icon"><Sparkles size={15} /></div>
        <div><span className="terra-tools-kicker">SERVER-SIDE MANUS LLM · NASA CMR</span><h3 id="ai-scout-title">AI Scout / الكشاف الذكي</h3></div>
      </header>
      <p className="terra-tools-copy">Ask for candidate environments. النتائج فرضيات للبحث وليست اكتشافات مؤكدة أو إثباتًا لموقع هبوط.</p>
      <textarea className="scout-input" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runScout(); }} placeholder="e.g. Find basaltic lava tubes in arid regions for Moon field testing… / ابحث عن…" maxLength={400} aria-label="AI Scout search question" />
      <div className="scout-controls"><select value={target} aria-label="Target body" disabled><option value="Moon">Moon · القمر</option><option value="Mars">Mars · المريخ</option><option value="Both">Moon + Mars · كلاهما</option></select><button className="scout-submit" onClick={runScout} disabled={scout.isPending || query.trim().length < 6}>{scout.isPending ? <><LoaderCircle size={13} className="spin" /> Scouting…</> : <><Search size={13} /> Scout analogs</>}</button></div>
      <div className="scout-disclaimer">GIS files remain local and are never sent to this request. AI suggestions have no coordinates unless independently verified.</div>
      {scout.error && <div className="terra-tool-error" role="alert">{scout.error.message || "AI Scout is unavailable. Try again later."}</div>}
      {scout.data && <div className="scout-result" aria-live="polite">
        <div className="scout-result-head"><strong>SCOUT REPORT · {scout.data.candidates.length} lead{scout.data.candidates.length === 1 ? "" : "s"}</strong><small>AI-generated · unverified</small></div>
        <p className="scout-disclaimer">{scout.data.summary}</p>
        {scout.data.candidates.map((candidate, index) => <article className="scout-candidate" key={`${candidate.name}-${index}`}>
          <h4>{candidate.name}</h4>
          <p className="scout-location">{candidate.location} · {candidate.country} · {candidate.target}</p>
          <p>{candidate.rationale}</p>
          <p><strong>Signals:</strong> {candidate.signals.join(" · ")}</p>
          <p><strong>Next checks:</strong> {candidate.validationSteps.join(" · ")}</p>
          <button onClick={() => addCandidate(candidate, index)}>{added.includes(candidate.name) ? <><Check size={12} /> Added to atlas</> : <><Plus size={12} /> Add hypothesis to atlas</>}</button>
        </article>)}
        {scout.data.cmrCollections.length > 0 ? <div className="scout-links"><strong>NASA CMR context—not site-specific proof:</strong>{scout.data.cmrCollections.map((record) => <a key={record.conceptId} href={record.url} target="_blank" rel="noreferrer" title={record.abstract}>{record.shortName} <ArrowUpRight size={10} /></a>)}</div> : <p className="scout-disclaimer">{scout.data.cmrStatus === "unavailable" ? "NASA CMR metadata was unavailable for this request." : "No matching NASA CMR collections found. The hypotheses are not source-verified."}</p>}
        <p className="scout-disclaimer">{scout.data.coordinateNotice} {scout.data.hypothesisNotice}</p>
      </div>}
    </section>
  );
}

export default AIScout;
