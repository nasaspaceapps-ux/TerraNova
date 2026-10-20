# TerraNova

TerraNova is a planetary-analog discovery system for the **2026 NASA Space Apps Challenge** prompt: identify Earth locations that can analog permanent Moon-base locations and Mars environments. It helps a research team compare topography, geology, environment, and resource-related context before a mission flies—without presenting an Earth analog as a guaranteed landing site or engineering recommendation.

## What is included

- A 44-row workbook catalog loaded into the interface with original fields preserved.
- Provenance-aware labels for reference context, exploratory candidates, approximate pins, representative points, geocoded leads, and unresolved coordinates.
- MapLibre Earth globe with optional Esri imagery, visible attribution, NASA Moon/Mars glTF views, named-feature registers, and local GIS import for GeoJSON, CSV, KML, and Shapefile ZIP.
- Terrain-only screening against separate NASA raster sources; the score is not a climate, resource, logistics, safety, landing, or construction-suitability assessment.
- AI Scout that treats generated records as hypotheses and does not invent coordinates or citations.
- A data-register panel that exposes the workbook row count, source status, raw Excel fields, and the scientific-screening warning.

## MapLibre Worker fix

The previous preview could fail with `Worker failed to load` because MapLibre's package-relative worker URL was rewritten by Vite to an internal `/@fs` path. TerraNova now ships the official `maplibre-gl-worker.mjs` as a same-origin public asset and calls `setWorkerUrl("/maplibre-gl-worker.mjs")` before creating the map. Preview and production use the same worker URL.

## Data integrity policy

The workbook is a lead list, not a scientific validation package. A row may combine multiple sites, broad regions, caves, formations, or expedition locations. The app preserves the raw fields, avoids inventing regional centroids, and labels coordinates as verified, representative, approximate, geocoded, or unresolved. Every candidate should be checked against primary sources and field constraints before being used in a hackathon claim, mission plan, or field activity.

## Scientific review status

An independent source review was completed for all 44 workbook records. The result is **44/44 partly supported**, with 39 records receiving high review confidence and 5 medium confidence; 9 records are flagged high risk because they combine multiple sites or contain claims that need narrower wording or a primary citation. The reviewed corrections, supported claims, and unverifiable claims are preserved in `data/scientific_audit_report.json`. The interface intentionally keeps all workbook records labelled **Unverified lead** and does not present the spreadsheet as scientifically validated.

## Run locally

```bash
pnpm install
pnpm check
pnpm build:static
pnpm exec vite preview --host 0.0.0.0 --port 4173
```

The static build is written to `dist/public`.

## Vercel deployment

The committed `vercel.json` builds the static Vite app with `pnpm run build` and
serves `dist/public` as an SPA. The previous default build also bundled
`server/_core/index.ts`; that server bundle is not required by this public
static app and caused Vercel's `entry point ... cannot be marked as external`
failure. The legacy server build remains available as `pnpm run build:server`.

GitHub is the source-code repository, not a live web server. Use the Vercel
deployment URL for the running application. A blank GitHub Pages screen means
Pages has not been configured; it does not mean the React source is missing.

## Main paths

- `client/src/components/Home.tsx` — application shell, catalog workflow, and data-register UI
- `client/src/components/EarthGlobeMap.tsx` — MapLibre Earth globe and GIS layers
- `client/public/maplibre-gl-worker.mjs` — pinned same-origin MapLibre worker
- `client/public/terranova-logo.jpg` — team logo supplied for the project
- `client/src/data/geminiCandidates.raw.json` — normalized workbook records used by the app
- `data/worksheet_sites.json` — preserved worksheet extraction used for structural auditing
- `data/scientific_audit_report.json` — per-record review verdicts, corrections, and unresolved claims
- `client/src/data/` — catalog, planetary references, terrain helpers, and NASA source metadata
