import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const GOOGLE_PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY // opcional pero recomendado
const BATCH_SIZE = parseInt(process.env.AUDIT_BATCH_SIZE || '40', 10)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}
if (!FIRECRAWL_API_KEY) {
  console.error('Falta FIRECRAWL_API_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Dominios que no cuentan como "sitio propio" del negocio
const DIRECTORY_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'yelp.com',
  'yellowpages.com',
  'mapquest.com',
  'google.com',
  'maps.google.com',
  'foursquare.com',
  'tripadvisor.com',
  'linkedin.com',
  'bbb.org',
  'nextdoor.com',
]

function isOwnWebsite(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return !DIRECTORY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

async function auditWithPageSpeed(website) {
  const params = new URLSearchParams({
    url: website,
    strategy: 'mobile',
  })
  params.append('category', 'PERFORMANCE')
  if (GOOGLE_PAGESPEED_API_KEY) params.set('key', GOOGLE_PAGESPEED_API_KEY)

  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`PageSpeed respondió ${response.status}`)
  }

  const data = await response.json()

  if (!data.lighthouseResult) {
    // La API respondió 200 pero sin resultado utilizable (sitio bloqueó el
    // crawler, redirect raro, certificado inválido, etc.)
    throw new Error(data.error?.message || 'Sin lighthouseResult en la respuesta')
  }

  const perfScore = data.lighthouseResult?.categories?.performance?.score
  const viewportAudit = data.lighthouseResult?.audits?.viewport
  const finalUrl = data.lighthouseResult?.finalUrl || website

  return {
    has_website: true,
    website_verified: true,
    pagespeed_score: perfScore != null ? Math.round(perfScore * 100) : null,
    is_responsive: viewportAudit ? viewportAudit.score === 1 : null,
    has_ssl: finalUrl.startsWith('https://'),
    social_activity: null,
  }
}

async function searchFirecrawl(query) {
  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({ query, limit: 5 }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl respondió ${response.status}`)
  }

  const data = await response.json()
  // Firecrawl devuelve { success, data: [{ url, title, description }, ...] }
  return (data.data ?? []).map((r) => ({ url: r.url }))
}

async function auditWithoutWebsite(prospect) {
  const query = [prospect.name, prospect.city, prospect.country].filter(Boolean).join(' ')
  const results = await searchFirecrawl(query)

  const ownSite = results.find((r) => isOwnWebsite(r.url))
  const socialResult = results.find((r) =>
    ['facebook.com', 'instagram.com'].some((d) => r.url.includes(d)),
  )

  if (ownSite) {
    // Encontramos un sitio real que OSM no tenía cargado. Lo guardamos en prospects también.
    await supabase.from('prospects').update({ website: ownSite.url }).eq('id', prospect.id)
    return {
      has_website: true,
      website_verified: true,
      pagespeed_score: null, // se audita en la próxima corrida ahora que sabemos que existe
      is_responsive: null,
      has_ssl: null,
      social_activity: socialResult ? socialResult.url : null,
    }
  }

  return {
    has_website: false,
    website_verified: true,
    pagespeed_score: null,
    is_responsive: null,
    has_ssl: null,
    social_activity: socialResult ? socialResult.url : null,
  }
}

async function run() {
  const { data: pending, error } = await supabase
    .from('pending_audit')
    .select('id, name, city, country, website')
    .limit(BATCH_SIZE)

  if (error) {
    console.error('Error cargando pending_audit:', error.message)
    process.exit(1)
  }

  if (!pending.length) {
    console.log('No hay prospectos pendientes de auditar.')
    return
  }

  console.log(`Auditando ${pending.length} prospectos...`)

  let withWebsite = 0
  let confirmedNoWebsite = 0
  let foundHiddenWebsite = 0
  let errors = 0

  for (const prospect of pending) {
    let auditResult

    try {
      if (prospect.website) {
        console.log(`PageSpeed: ${prospect.name}`)
        auditResult = await auditWithPageSpeed(prospect.website)
        withWebsite++
        await sleep(1500)
      } else {
        console.log(`Firecrawl: ${prospect.name}`)
        auditResult = await auditWithoutWebsite(prospect)
        if (auditResult.has_website) foundHiddenWebsite++
        else confirmedNoWebsite++
        await sleep(1000)
      }

      await supabase.from('site_audits').insert({ prospect_id: prospect.id, ...auditResult })
    } catch (err) {
      console.error(`  Error con ${prospect.name}: ${err.message}`)
      errors++
      // Guardamos un registro vacío para que no se quede en el loop de pendientes para siempre
      await supabase.from('site_audits').insert({
        prospect_id: prospect.id,
        has_website: Boolean(prospect.website),
        website_verified: false,
      })
    }
  }

  console.log(
    `\nResumen: ${withWebsite} auditados por PageSpeed, ${foundHiddenWebsite} sitios ocultos encontrados, ${confirmedNoWebsite} confirmados sin sitio, ${errors} errores.`,
  )
}

run().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
