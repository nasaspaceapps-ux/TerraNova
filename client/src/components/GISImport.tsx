import { useRef, useState } from "react";
import { Eye, EyeOff, FileUp, Layers3, MapPin, Mountain, Trash2, X } from "lucide-react";
import { parseGISFile, type GISLayer } from "@/data/gisData";
import { calculateAnalogScore, type AnalogTargetBody } from "@/data/analogScore";
import { fetchEarthTerrainWindow, type EarthTerrainWindow } from "@/data/earthTerrain";
import type { PlanetBody } from "@/data/nasaSources";
import "@/terra-tools.css";

type Props = {
  body: PlanetBody;
  scoreTarget: AnalogTargetBody;
  layers: GISLayer[];
  onLayerAdd: (layer: GISLayer) => void;
  onLayerVisibility: (id: string) => void;
  onLayerRemove: (id: string) => void;
  onClose?: () => void;
};

type SampleState = Record<string, "loading" | "error">;
function sampleKey(layerId: string, target: AnalogTargetBody) { return `${layerId}:${target}`; }

function GISImport({ body, scoreTarget, layers, onLayerAdd, onLayerVisibility, onLayerRemove, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [samples, setSamples] = useState<Record<string, EarthTerrainWindow>>({});
  const [sampleState, setSampleState] = useState<SampleState>({});
  const bodyLayers = layers.filter((layer) => layer.body === body);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const layer = await parseGISFile(file, body);
      onLayerAdd(layer);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Could not read this GIS file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const analyzeLayer = async (layer: GISLayer) => {
    if (!layer.samplePoint) return;
    const key = sampleKey(layer.id, scoreTarget);
    if (sampleState[key] === "loading") return;
    setSampleState((current) => ({ ...current, [key]: "loading" }));
    try {
      const result = await fetchEarthTerrainWindow(layer.samplePoint.latitude, layer.samplePoint.longitude, scoreTarget);
      setSamples((current) => ({ ...current, [key]: result }));
      setSampleState((current) => { const next = { ...current }; delete next[key]; return next; });
    } catch {
      setSampleState((current) => ({ ...current, [key]: "error" }));
    }
  };

  return (
    <section className="terra-tools-card gis-import-card" aria-labelledby="gis-import-title">
      <header className="terra-tools-header">
        <div className="terra-tools-icon"><Layers3 size={15} /></div>
        <div><span className="terra-tools-kicker">CUSTOM LAYERS · LOCAL ONLY</span><h3 id="gis-import-title">Import GIS / استيراد طبقات</h3></div>
        {onClose && <button className="terra-tool-icon-button" onClick={onClose} aria-label="Close GIS import"><X size={15} /></button>}
      </header>
      <p className="terra-tools-copy">Load GeoJSON, CSV points, KML or Shapefile ZIP. The file stays in this browser session; it is not uploaded or sent to AI Scout.</p>
      <div className="gis-body-select">CURRENT BODY / الجرم الحالي <strong>{body} · select a body in the atlas first / اختره من الخريطة أولًا</strong></div>
      <input ref={inputRef} className="gis-file-input" type="file" accept=".geojson,.json,.csv,.kml,.zip,application/geo+json,application/json,text/csv,application/vnd.google-earth.kml+xml,application/zip" onChange={(event) => void handleFile(event.target.files?.[0])} />
      <button className="gis-upload-button" onClick={() => inputRef.current?.click()} disabled={busy}><FileUp size={16} />{busy ? "Reading file… / جارٍ التحليل" : "Choose GIS file / اختر ملفًا"}</button>
      {error && <div className="terra-tool-error" role="alert">{error}</div>}
      {body === "Earth" ? <p className="gis-analysis-note">Earth import expects WGS84 longitude/latitude. Use Analyze for a sparse ASTER terrain score at the first feature’s representative point—not full polygon or layer-wide analysis. / نقطة تمثيلية فقط.</p> : <p className="gis-analysis-note">Moon/Mars feature centroids are displayed on the 3D globe. Confirm east-positive longitude and body-specific latitude conventions before interpreting them. ASTER terrain sampling applies to Earth layers only.</p>}
      <div className="gis-layer-list">
        <div className="gis-layer-heading"><strong>Layers / الطبقات</strong><span>{bodyLayers.length} on {body}</span></div>
        {bodyLayers.length === 0 && <div className="gis-empty">No GIS layer loaded for {body} yet.</div>}
        {bodyLayers.map((layer) => {
          const key = sampleKey(layer.id, scoreTarget);
          const sample = samples[key] ?? null;
          const status = sampleState[key];
          const score = calculateAnalogScore(sample, scoreTarget);
          return <article className="gis-layer-row" key={layer.id}>
            <div className="gis-layer-main">
              <div className="gis-layer-name"><span className="gis-layer-dot" /><strong title={layer.fileName}>{layer.name}</strong></div>
              <small>{layer.featureCount.toLocaleString()} features · {Object.entries(layer.geometryCounts).map(([name, count]) => `${count} ${name}`).join(", ")}</small>
              {layer.samplePoint && <small className="gis-layer-sample"><MapPin size={10} /> First feature representative point · {layer.samplePoint.latitude.toFixed(4)}°, {layer.samplePoint.longitude.toFixed(4)}°</small>}
              <small className="gis-layer-warning">{layer.note}</small>
              {body === "Earth" && layer.samplePoint && <button className="gis-analyze-button" onClick={() => void analyzeLayer(layer)} disabled={status === "loading"}><Mountain size={12} />{status === "loading" ? "Sampling ASTER…" : `Analyze against ${scoreTarget} / حلّل`}</button>}
              {status === "error" && <small className="gis-analysis-error">ASTER unavailable; retry the sample.</small>}
              {sample && <div className="gis-score-result"><strong>{score.score === null ? "—" : `${score.score}%`}</strong><span>{scoreTarget} terrain proxy · {score.coverage}% coverage</span><small>{sample.samplesUsed}/9 ASTER neighborhoods · point-only, not polygon-wide.</small></div>}
            </div>
            <div className="gis-layer-actions"><button onClick={() => onLayerVisibility(layer.id)} aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`} title={layer.visible ? "Hide layer" : "Show layer"}>{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button onClick={() => onLayerRemove(layer.id)} aria-label={`Remove ${layer.name}`} title="Remove layer"><Trash2 size={14} /></button></div>
          </article>;
        })}
      </div>
      <div className="gis-local-badge"><span /> Session memory only <i>·</i> no server upload</div>
    </section>
  );
}

export default GISImport;
