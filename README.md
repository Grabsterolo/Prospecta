# Prospecta

Radar comercial: detecta negocios con presencia digital débil, les asigna un puntaje de prioridad y sugiere qué servicio de Aurevo ofrecerles.

## Stack

React + Vite + TypeScript + Tailwind + Supabase.

## Setup local

```bash
npm install
cp .env.example .env.local
# pega tu VITE_SUPABASE_ANON_KEY en .env.local (Settings > API en el proyecto Prospecta de Supabase)
npm run dev
```

## Deploy

Pensado para Cloudflare Pages, mismo patrón que cecmarketing:

- Build command: `npm run build`
- Output directory: `dist`
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Estructura de datos

El frontend lee de la vista `prospect_overview` en Supabase, que ya junta cada prospecto con su score más reciente y su estado de outreach. Las tablas base (`prospects`, `site_audits`, `scores`, `outreach`, `proposals`, `target_categories`) las llenan los scripts de escaneo (fase de GitHub Actions, aparte de este repo de interfaz).
