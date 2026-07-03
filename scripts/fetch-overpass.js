import { createClient } from '@supabase/supabase-js'

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

async function resolveTargets() {
  // Corrida puntual: viene de los inputs manuales del workflow (ciudad/país/área)
  const adhocCity = process.env.ADHOC_CITY?.trim()
  if (adhocCity) {
    const country = process.env.ADHOC_COUNTRY?.trim() || null
    const osmArea = process.env.ADHOC_OSM_AREA?.trim() || adhocCity
    console.log(`Modo puntual: ${adhocCity}, ${country ?? 'sin país especificado'} (área OSM: ${osmArea})`)
    return [{ city: adhocCity, country, osmArea }]
  }

  // Corrida programada: usa las ciudades activas guardadas en Supabase (tabla scan_targets)
  console.log('Modo programado: usando scan_targets activos en Supabase')
  const { data, error } = await supabase.from('scan_targets').select('city, country, osm_area').eq('active', true)

  if (error) {
    console.error('Error cargando scan_targets:', error.message)
    process.exit(1)
  }

  if (!data.length) {
    console.log('No hay ciudades activas en scan_targets. Nada que escanear.')
    process.exit(0)
  }

  return data.map((t) => ({ city: t.city, country: t.country, osmArea: t.osm_area }))
}

async function resolveCategories() {
  const adhocCategory = process.env.ADHOC_CATEGORY?.trim()

  let query = supabase.from('target_categories').select('category_key, osm_tag').eq('active', true)
  if (adhocCategory) {
    query = query.eq('category_key', adhocCategory)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error cargando target_categories:', error.message)
    process.exit(1)
  }

  if (!data.length) {
    if (adhocCategory) {
      console.error(`No se encontró el rubro "${adhocCategory}" activo en target_categories.`)
    } else {
      console.log('No hay categorías activas. Nada que escanear.')
    }
    process.exit(adhocCategory ? 1 : 0)
  }

  return data
}

async function run() {
  const targets = await resolveTargets()
  const categories = await resolveCategories()

  let totalFound = 0
  let totalUpserted = 0

  for (const target of targets) {
    for (const category of categories) {
      console.log(`Escaneando ${category.category_key} en ${target.city}, ${target.country ?? '—'}...`)

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
