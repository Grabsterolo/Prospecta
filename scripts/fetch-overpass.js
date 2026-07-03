import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const REQUEST_DELAY_MS = 3000 // respeta el uso justo de Overpass entre consultas

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildQuery(osmArea, osmTag) {
  const [key, value] = osmTag.split('=')
  return `
    [out:json][timeout:60];
    area["name"="${osmArea}"]["boundary"="administrative"]->.searchArea;
    (
      node["${key}"="${value}"](area.searchArea);
      way["${key}"="${value}"](area.searchArea);
    );
    out center tags;
  `
}

async function fetchOverpass(osmArea, osmTag) {
  const query = buildQuery(osmArea, osmTag)
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Prospecta/0.1 (radar comercial interno, contacto: aurevostudiocr@gmail.com)',
    },
  })

  if (!response.ok) {
    throw new Error(`Overpass respondió ${response.status} para ${osmArea} / ${osmTag}`)
  }

  const data = await response.json()
  return data.elements ?? []
}

function pickPhone(tags) {
  return tags.phone || tags['contact:phone'] || tags.mobile || null
}

function pickWebsite(tags) {
  return tags.website || tags['contact:website'] || tags['brand:website'] || null
}

function buildAddress(tags) {
  const parts = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

function mapElementToProspect(element, categoryKey, city, country) {
  const tags = element.tags ?? {}
  const sourceId = `${element.type}/${element.id}`
  const lat = element.type === 'node' ? element.lat : element.center?.lat
  const lon = element.type === 'node' ? element.lon : element.center?.lon

  return {
    source: 'osm',
    source_id: sourceId,
    name: tags.name ?? null,
    category: categoryKey,
    country,
    city: tags['addr:city'] ?? city,
    address: buildAddress(tags),
    phone: pickPhone(tags),
    website: pickWebsite(tags),
    email: tags.email ?? null,
    specialty: tags['healthcare:speciality'] ?? null,
    lat: lat ?? null,
    lng: lon ?? null,
    raw_tags: tags,
    updated_at: new Date().toISOString(),
  }
}

async function run() {
  const targets = JSON.parse(readFileSync(new URL('./scan-targets.json', import.meta.url)))

  const { data: categories, error: catError } = await supabase
    .from('target_categories')
    .select('category_key, osm_tag')
    .eq('active', true)

  if (catError) {
    console.error('Error cargando target_categories:', catError.message)
    process.exit(1)
  }

  if (!categories.length) {
    console.log('No hay categorías activas. Nada que escanear.')
    return
  }

  let totalFound = 0
  let totalUpserted = 0

  for (const target of targets) {
    for (const category of categories) {
      console.log(`Escaneando ${category.category_key} en ${target.city}, ${target.country}...`)

      let elements = []
      try {
        elements = await fetchOverpass(target.osmArea, category.osm_tag)
      } catch (err) {
        console.error(`  Error: ${err.message}`)
        await sleep(REQUEST_DELAY_MS)
        continue
      }

      const prospects = elements
        .filter((el) => el.tags?.name) // descartamos registros sin nombre, son ruido
        .map((el) => mapElementToProspect(el, category.category_key, target.city, target.country))

      totalFound += prospects.length

      if (prospects.length) {
        const { error: upsertError } = await supabase
          .from('prospects')
          .upsert(prospects, { onConflict: 'source,source_id' })

        if (upsertError) {
          console.error(`  Error guardando en Supabase: ${upsertError.message}`)
        } else {
          totalUpserted += prospects.length
          console.log(`  ${prospects.length} prospectos guardados/actualizados.`)
        }
      } else {
        console.log('  Sin resultados con nombre válido.')
      }

      await sleep(REQUEST_DELAY_MS)
    }
  }

  console.log(`\nResumen: ${totalFound} encontrados, ${totalUpserted} guardados/actualizados en Supabase.`)
}

run().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
