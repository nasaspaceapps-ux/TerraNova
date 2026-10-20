import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, AttributionControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import { Map, RotateCcw, Satellite } from "lucide-react";
import type { GISLayer } from "@/data/gisData";
import type { PlanetBody } from "@/data/nasaSources";
import type { Site } from "@/data/sites";
import { evidenceBandForSite } from "@/data/missionScenarios";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/terra-map.css";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
// Vite can rewrite MapLibre's package-relative worker URL to an internal /@fs path in preview.
// Ship the official worker as a same-origin public asset so preview and production use the same URL.
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);
const IMAGERY_SOURCE_ID = "terra-esri-imagery-source";
const IMAGERY_LAYER_ID = "terra-esri-imagery";
const SITE_SOURCE_ID = "terra-site-source";
const SITE_LAYER_ID = "terra-site-markers";
const EARTH_RASTER_ATTRIBUTION = "Tiles © Esri, Vantor, Earthstar Geographics, and the GIS User Community";

type Props = {
  sites: Site[];
  selectedId: string;
  onSelect: (siteId: string) => void;
  onWorldChange: (body: PlanetBody) => void;
  onShowNASA: () => void;
  gisLayers: GISLayer[];
};

function makeSiteCollection(sites: Site[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: sites.filter((site) => typeof site.lat === "number" && typeof site.lon === "number").map((site) => ({
      type: "Feature",
      id: site.id,
      properties: { id: site.id, name: site.name, kind: site.kind, country: site.country, confidence: site.confidence, evidenceBand: evidenceBandForSite(site) },
      geometry: { type: "Point", coordinates: [site.lon!, site.lat!] },
    } as Feature<Point>)),
  };
}

function syncGISLayers(map: MapLibreMap, layers: GISLayer[], trackedSourceIds: Set<string>) {
  const wanted = new Set<string>();
  const firstSymbol = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
  for (const layer of layers) {
    const sourceId = `terra-gis-${layer.id}`;
    wanted.add(sourceId);
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) existing.setData(layer.data as FeatureCollection);
    else {
      map.addSource(sourceId, { type: "geojson", data: layer.data as FeatureCollection });
      map.addLayer({
        id: `${sourceId}-fill`, type: "fill", source: sourceId,
        filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
        layout: { visibility: layer.visible && layer.body === "Earth" ? "visible" : "none" },
        paint: { "fill-color": "#c6ef62", "fill-opacity": 0.16 },
      }, firstSymbol);
      map.addLayer({
        id: `${sourceId}-line`, type: "line", source: sourceId,
        layout: { visibility: layer.visible && layer.body === "Earth" ? "visible" : "none" },
        paint: { "line-color": "#d5f56c", "line-width": 2, "line-opacity": 0.9 },
      }, firstSymbol);
      map.addLayer({
        id: `${sourceId}-point`, type: "circle", source: sourceId,
        filter: ["any", ["==", ["geometry-type"], "Point"], ["==", ["geometry-type"], "MultiPoint"]],
        layout: { visibility: layer.visible && layer.body === "Earth" ? "visible" : "none" },
        paint: { "circle-radius": 5, "circle-color": "#d5f56c", "circle-stroke-color": "#14201b", "circle-stroke-width": 1.5 },
      }, firstSymbol);
      trackedSourceIds.add(sourceId);
    }
    for (const suffix of ["fill", "line", "point"]) {
      const id = `${sourceId}-${suffix}`;
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layer.visible && layer.body === "Earth" ? "visible" : "none");
    }
  }
  for (const sourceId of [...trackedSourceIds]) {
    if (wanted.has(sourceId)) continue;
    for (const suffix of ["point", "line", "fill"]) {
      const layerId = `${sourceId}-${suffix}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    trackedSourceIds.delete(sourceId);
  }
}

function EarthGlobeMap({ sites, selectedId, onSelect, onWorldChange, onShowNASA, gisLayers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const trackedGIS = useRef(new Set<string>());
  const currentRef = useRef({ sites, selectedId, onSelect, gisLayers });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [imageryOn, setImageryOn] = useState(true);
  const [mapError, setMapError] = useState("");

  currentRef.current = { sites, selectedId, onSelect, gisLayers };
  const selected = useMemo(() => sites.find((site) => site.id === selectedId), [sites, selectedId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const start = selected?.lat !== null && selected?.lat !== undefined && selected?.lon !== null && selected?.lon !== undefined
      ? [selected.lon, selected.lat] as [number, number]
      : [15, 20] as [number, number];
    const map = new MapLibreMap({
      container,
      style: OPENFREEMAP_STYLE,
      center: start,
      zoom: selected ? 2.2 : 1.45,
      minZoom: 1,
      maxZoom: 19,
      attributionControl: false,
      renderWorldCopies: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: false }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true, customAttribution: EARTH_RASTER_ATTRIBUTION }), "bottom-left");
    let styleLoaded = false;
    const handleLoad = () => {
      try {
        styleLoaded = true;
        map.setProjection({ type: "globe" });
        const firstSymbol = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
        map.addSource(IMAGERY_SOURCE_ID, {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          maxzoom: 19,
          attribution: EARTH_RASTER_ATTRIBUTION,
        });
        map.addLayer({
          id: IMAGERY_LAYER_ID, type: "raster", source: IMAGERY_SOURCE_ID,
          layout: { visibility: imageryOn ? "visible" : "none" },
          paint: { "raster-opacity": 0.88 },
        }, firstSymbol);
        map.addSource(SITE_SOURCE_ID, { type: "geojson", data: makeSiteCollection(currentRef.current.sites), promoteId: "id" });
        map.addLayer({
          id: SITE_LAYER_ID,
          type: "circle",
          source: SITE_SOURCE_ID,
          paint: {
            "circle-radius": ["case", ["==", ["get", "id"], currentRef.current.selectedId], 8, 5],
            "circle-color": ["match", ["get", "evidenceBand"], "high", "#74d8d1", "medium", "#d3ef70", "low", "#e28a60", "unresolved", "#8a9890", "#d3ef70"],
            "circle-stroke-color": "#10201d",
            "circle-stroke-width": 1.8,
            "circle-opacity": 0.95,
          },
        }, firstSymbol);
        map.addLayer({
          id: "terra-site-labels",
          type: "symbol",
          source: SITE_SOURCE_ID,
          minzoom: 3.2,
          layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top", "text-allow-overlap": false },
          paint: { "text-color": "#eef3dc", "text-halo-color": "#101817", "text-halo-width": 1.6 },
        }, firstSymbol);
        map.on("click", SITE_LAYER_ID, (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") currentRef.current.onSelect(id);
        });
        map.on("mouseenter", SITE_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", SITE_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
        syncGISLayers(map, currentRef.current.gisLayers, trackedGIS.current);
        setMapLoaded(true);
      } catch (error) {
        setMapError(error instanceof Error ? error.message : "Unable to initialize the Earth map layers.");
      }
    };
    map.on("load", handleLoad);
    map.on("error", (event) => {
      if (!styleLoaded && event.error?.message) setMapError(event.error.message);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      trackedGIS.current.clear();
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource(SITE_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(makeSiteCollection(sites));
    map.setPaintProperty(SITE_LAYER_ID, "circle-radius", ["case", ["==", ["get", "id"], selectedId], 8, 5]);
  }, [sites, selectedId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    syncGISLayers(map, gisLayers, trackedGIS.current);
  }, [gisLayers, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const layer = map.getLayer(IMAGERY_LAYER_ID);
    if (layer) map.setLayoutProperty(IMAGERY_LAYER_ID, "visibility", imageryOn ? "visible" : "none");
  }, [imageryOn, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selected || selected.lat === null || selected.lon === null) return;
    map.flyTo({ center: [selected.lon, selected.lat], zoom: Math.max(map.getZoom(), 3.5), duration: 700, essential: false });
  }, [selectedId, mapLoaded]);

  return (
    <section className="earth-map-shell" aria-label="Interactive Earth globe map">
      <div className="earth-map-toolbar">
        <div className="earth-map-toolbar-left">
          <div className="earth-map-mode"><span className="earth-map-live" /> MAPLIBRE GLOBE <span>/</span> NASA ANALOG ATLAS</div>
          <div className="earth-map-world-tabs" aria-label="Choose planetary globe">
            <button className="active" aria-current="page">Earth</button>
            <button onClick={() => onWorldChange("Moon")}>Moon</button>
            <button onClick={() => onWorldChange("Mars")}>Mars</button>
          </div>
        </div>
        <div className="earth-map-actions">
          <button className={imageryOn ? "earth-map-tool active" : "earth-map-tool"} onClick={() => setImageryOn((value) => !value)} aria-pressed={imageryOn} title="Toggle Esri satellite imagery"><Satellite size={14} /> Satellite</button>
          <button className="earth-map-tool" onClick={() => { const map = mapRef.current; if (!map) return; map.flyTo({ center: [15, 20], zoom: 1.45, pitch: 0, bearing: 0, duration: 500 }); }} title="Reset Earth view"><RotateCcw size={13} /> Reset</button>
          <button className="earth-map-tool" onClick={onShowNASA} title="Show the official NASA Earth glTF model"><Map size={13} /> NASA 3D</button>
        </div>
      </div>
      <div className="earth-map-viewport" ref={containerRef}>
        {!mapLoaded && !mapError && <div className="earth-map-loading"><i />Loading interactive Earth globe…</div>}
        {mapError && <div className="earth-map-error"><strong>Map tiles are temporarily unavailable.</strong><span>{mapError}</span><small>Check network access; NASA data and site records remain available in the console.</small></div>}
        <div className="earth-map-corner-tag"><span>EARTH · 3D</span><small>Drag to rotate · scroll/pinch to zoom</small></div>
        <div className="earth-map-coordinate">{selected?.lat === null || selected?.lat === undefined ? "NO COORDINATE · UNLOCATED LEAD" : `${selected.lat.toFixed(4)}°, ${selected.lon?.toFixed(4)}° · ${selected.coordinateStatus ?? "approximate"}`}</div>
        <div className="earth-map-source-note">OpenFreeMap / OpenStreetMap · Esri imagery attribution shown on map</div>
      </div>
      <div className="earth-map-footer"><span><i className="map-legend-dot reference" /> High evidence</span><span><i className="map-legend-dot candidate" /> Partial</span><span><i className="map-legend-dot review" /> Review / unresolved</span><small>Marker colour shows evidence quality, not scientific suitability.</small></div>
    </section>
  );
}

export default EarthGlobeMap;
