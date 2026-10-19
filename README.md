# TerraNova

TerraNova is a planetary-analogue discovery interface for comparing Earth field locations with Moon and Mars mission environments. It presents site records, NASA/USGS context, terrain screening, GIS imports, and a MapLibre Earth globe.

## MapLibre Worker fix

The previous preview could fail with `Worker failed to load` because MapLibre's package-relative worker URL was rewritten by Vite to an internal `/@fs` path. TerraNova now:

- ships the official `maplibre-gl-worker.mjs` as a same-origin public asset;
- calls `setWorkerUrl("/maplibre-gl-worker.mjs")` before creating a map;
- uses the same worker URL in preview and production builds.

This avoids relying on Vite's internal filesystem URLs.

## Run locally

```bash
pnpm install
pnpm check
pnpm build:static
pnpm exec vite preview --host 0.0.0.0 --port 4173
```

The static build is written to `dist/public`. `pnpm check` covers the client application used by the public static deployment.

## Data note

Some spreadsheet rows are leads or representative points rather than source-verified boundaries. The interface labels unresolved, approximate, geocoded, AI-generated, and reference records separately. AI Scout fallback results are hypotheses with no assigned coordinates; validate every lead against primary sources before field use.

## Main paths

- `client/src/components/Home.tsx` — application shell and catalog workflow
- `client/src/components/EarthGlobeMap.tsx` — MapLibre Earth globe and GIS layers
- `client/public/maplibre-gl-worker.mjs` — pinned same-origin MapLibre worker
- `client/src/data/` — catalog, planetary references, terrain helpers, and NASA source metadata
- `data/NewMicrosoftExcelWorksheet.xlsx` — supplied spreadsheet copy
