import { useMemo, useState } from "react";
import { ArrowUpRight, RotateCcw, X } from "lucide-react";
import type { Site } from "@/data/sites";

type Body = "Moon" | "Mars";
type FeatureId = "temperature" | "range" | "aridity" | "relief" | "ice" | "basalt";
type Feature = { id: FeatureId; label: string; labelAr: string };
type TargetProfile = { name: string; nameAr: string; values: number[] };

const FEATURES: Feature[] = [
  { id: "temperature", label: "Temperature", labelAr: "الحرارة" },
  { id: "range", label: "Day/night range", labelAr: "فرق الليل والنهار" },
  { id: "aridity", label: "Aridity", labelAr: "الجفاف" },
  { id: "relief", label: "Relief", labelAr: "التضاريس" },
  { id: "ice", label: "Ice / permafrost", labelAr: "الجليد" },
  { id: "basalt", label: "Basalt / volcanic", labelAr: "البازلت / البركانية" },
];

const TARGETS: Record<Body, TargetProfile[]> = {
  Moon: [
    { name: "Shackleton Rim", nameAr: "حافة شاكليتون", values: [.08, .96, .92, .76, .88, .74] },
    { name: "Malapert Massif", nameAr: "كتلة مالابرت", values: [.14, .92, .95, .82, .42, .70] },
  ],
  Mars: [
    { name: "Jezero Crater", nameAr: "فوهة جيزيرو", values: [.24, .76, .94, .42, .34, .72] },
    { name: "Gale Crater", nameAr: "فوهة غيل", values: [.27, .73, .92, .58, .28, .62] },
    { name: "Oxia Planum", nameAr: "أوكسا بلانوم", values: [.25, .78, .96, .22, .22, .55] },
  ],
};

const DEFAULT_WEIGHTS = [1, 1, 1, 1, 1, 1];

function textFor(site: Site) {
  return `${site.tags.join(" ")} ${site.environment ?? ""} ${site.geology ?? ""} ${site.analogCategory ?? ""} ${site.description}`.toLowerCase();
}

function featureVector(site: Site): number[] {
  const text = textFor(site);
  const has = (...terms: string[]) => terms.some((term) => text.includes(term));
  return [
    has("polar", "ice", "cold", "antarctica", "arctic") ? .12 : has("hot", "danakil", "desert") ? .82 : .48,
    has("high altitude", "polar", "cold", "remote") ? .78 : has("desert", "arid", "hyper-arid") ? .64 : .45,
    has("hyper-arid", "arid", "desert", "dry", "gravel") ? .94 : has("polar", "cold") ? .72 : .42,
    has("rough", "crater", "highlands", "massif", "lava") ? .78 : has("basin", "plains") ? .36 : .5,
    has("ice", "permafrost", "polar", "antarctica", "arctic") ? .86 : .04,
    has("basalt", "lava", "volcanic", "mauna", "igneous") ? .94 : .18,
  ];
}

function similarity(a: number[], b: number[], weights: number[]) {
  let weighted = 0;
  let total = 0;
  a.forEach((value, index) => { weighted += weights[index] * Math.abs(value - b[index]); total += weights[index]; });
  return Math.max(0, Math.round((1 - weighted / Math.max(total, 1)) * 100));
}

function polarPoint(cx: number, cy: number, radius: number, index: number, total: number, value: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [cx + Math.cos(angle) * radius * value, cy + Math.sin(angle) * radius * value];
}

function polygon(values: number[], cx: number, cy: number, radius: number) {
  return values.map((value, index) => polarPoint(cx, cy, radius, index, values.length, value).join(",")).join(" ");
}

export default function AnalogFinder({ sites, selectedId, onSelect, onClose }: { sites: Site[]; selectedId: string; onSelect: (id: string) => void; onClose: () => void }) {
  const [body, setBody] = useState<Body>("Moon");
  const [targetIndex, setTargetIndex] = useState(0);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const target = TARGETS[body][targetIndex] ?? TARGETS[body][0];
  const ranked = useMemo(() => sites.map((site) => ({ site, vector: featureVector(site) })).map((item) => ({ ...item, score: similarity(item.vector, target.values, weights) })).sort((a, b) => b.score - a.score), [sites, target, weights]);
  const selected = ranked.find((item) => item.site.id === selectedId) ?? ranked[0];
  const resetWeights = () => setWeights(DEFAULT_WEIGHTS);

  return <div className="modal-backdrop analog-finder-backdrop" onClick={onClose}><section className="modal-card analog-finder-modal" onClick={(event) => event.stopPropagation()}>
    <div className="modal-head"><div><span className="section-index">ANALOG FINDER / مكتشف النظائر</span><h2>Earth analogs for Moon & Mars bases</h2><p className="analog-subtitle">Interactive feature-weighted screening inspired by the NewTerra prototype.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button></div>
    <div className="analog-controls"><div className="analog-body-tabs"><button className={body === "Moon" ? "active moon" : "moon"} onClick={() => { setBody("Moon"); setTargetIndex(0); }}>Moon <small>القمر</small></button><button className={body === "Mars" ? "active mars" : "mars"} onClick={() => { setBody("Mars"); setTargetIndex(0); }}>Mars <small>المريخ</small></button></div><label className="analog-target-select">TARGET SITE / الموقع<select value={targetIndex} onChange={(event) => setTargetIndex(Number(event.target.value))}>{TARGETS[body].map((item, index) => <option value={index} key={item.name}>{item.name} · {item.nameAr}</option>)}</select></label></div>
    <div className="analog-finder-grid">
      <aside className="analog-weights"><div className="analog-panel-title"><strong>FEATURE WEIGHTS</strong><button onClick={resetWeights} title="Reset weights"><RotateCcw size={12} /></button></div><p>Move a slider to tell the finder what matters most for this mission.</p>{FEATURES.map((feature, index) => <label className="analog-weight" key={feature.id}><span><b>{feature.label}</b><small>{feature.labelAr}</small></span><output>{weights[index].toFixed(1)}</output><input type="range" min="0" max="2" step="0.1" value={weights[index]} onChange={(event) => setWeights((current) => current.map((value, i) => i === index ? Number(event.target.value) : value))} /></label>)}<div className="analog-note">Prototype score uses catalog tags and descriptions. It is not a substitute for SRTM, ASTER, LOLA, MOLA, climate, or field measurements.</div></aside>
      <div className="analog-radar-panel"><div className="analog-panel-title"><strong>FEATURE PROFILE</strong><span>target vs selected Earth site</span></div><svg className="analog-radar" viewBox="0 0 360 310" role="img" aria-label="Radar comparison of target and selected site"><g>{[.33, .66, 1].map((level) => <polygon key={level} points={polygon(FEATURES.map(() => level), 180, 143, 100)} fill="none" stroke="var(--analog-line)" strokeWidth="1" />)}{FEATURES.map((feature, index) => { const [x, y] = polarPoint(180, 143, 100, index, FEATURES.length, 1); return <g key={feature.id}><line x1="180" y1="143" x2={x} y2={y} stroke="var(--analog-line)" /><text x={180 + (x - 180) * 1.22} y={143 + (y - 143) * 1.22} textAnchor="middle" className="radar-label">{feature.label}</text></g>; })}<polygon points={polygon(target.values, 180, 143, 100)} fill="rgba(117,216,209,.22)" stroke="var(--cyan)" strokeWidth="2" /><polygon points={polygon(selected?.vector ?? [0, 0, 0, 0, 0, 0], 180, 143, 100)} fill="rgba(211,239,112,.22)" stroke="var(--lime)" strokeWidth="2" /></g></svg><div className="radar-legend"><span><i className="radar-target" /> {target.name}</span><span><i className="radar-earth" /> {selected?.site.name ?? "No site"}</span></div><p className="analog-disclaimer">Similarity is a transparent triage score. A high score means the selected feature profile is closer—not that the Earth site is physically equivalent.</p></div>
      <aside className="analog-results"><div className="analog-panel-title"><strong>TOP EARTH ANALOGS</strong><span>{ranked.length} records</span></div>{ranked.slice(0, 8).map((item, index) => <button className={`analog-rank ${item.site.id === selected?.site.id ? "active" : ""}`} key={item.site.id} onClick={() => onSelect(item.site.id)}><span className="analog-rank-no">{String(index + 1).padStart(2, "0")}</span><span className="analog-rank-name"><b>{item.site.name}</b><small>{item.site.location} · {item.site.country}</small></span><strong>{item.score}%</strong><ArrowUpRight size={13} /></button>)}</aside>
    </div>
    <div className="analog-footer"><span><i /> Scores update instantly as weights change.</span><button className="modal-close" onClick={onClose}>Back to atlas / عودة للأطلس</button></div>
  </section></div>;
}
