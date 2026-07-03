import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Rubros donde el negocio depende de agendar citas / atención repetitiva por
// WhatsApp o teléfono. Son los candidatos naturales para un asistente de IA
// tipo Sofía, porque ya tienen el volumen de conversación que lo justifica.
const APPOINTMENT_DRIVEN_CATEGORIES = ['dentist', 'veterinary', 'beauty_salon', 'gym']

function scoreProspect(row) {
  const breakdown = {}
  let score = 0
  let offer = null

  if (row.has_website === false && row.website_verified) {
    // Confirmado sin sitio: es el prospecto más claro y urgente que existe.
    score = 90
    offer = 'sitio_web'
    breakdown.sin_sitio_confirmado = 90

    if (row.social_activity) {
      // Tiene redes activas pero no sitio: mejor prospecto todavía, ya
      // invierte tiempo en presencia digital, solo le falta la pieza central.
      score += 5
      breakdown.redes_activas_sin_sitio = 5
    }
  } else if (row.has_website && row.pagespeed_score == null) {
    // Tiene sitio pero no pudimos medirlo (timeout, bloqueo, etc.)
    // Prioridad baja hasta que se re-audite con un dato real.
    score = 35
    breakdown.sitio_sin_medir = 35
    offer = null
  } else if (row.has_website && row.pagespeed_score < 40) {
    score = 80
    breakdown.sitio_muy_lento = 80
    offer = 'sitio_web'
  } else if (row.has_website && row.pagespeed_score < 70) {
    score = 55
    breakdown.sitio_mejorable = 55
    offer = 'dashboard'
  } else {
    // Sitio rápido y sano: no necesita sitio nuevo. Le vendemos la capa
    // siguiente según qué tan dependiente es del contacto directo con clientes.
    score = 30
    breakdown.sitio_saludable = 30
    offer = APPOINTMENT_DRIVEN_CATEGORIES.includes(row.category) ? 'asistente_ia' : 'automatizacion'
  }

  if (row.has_website && row.has_ssl === false) {
    score += 10
    breakdown.sin_ssl = 10
  }

  return { score: Math.min(score, 100), offer, breakdown }
}

async function run() {
  const { data: rows, error } = await supabase.from('audited_prospects').select('*')

  if (error) {
    console.error('Error cargando audited_prospects:', error.message)
    process.exit(1)
  }

  if (!rows.length) {
    console.log('No hay prospectos auditados todavía. Nada que calificar.')
    return
  }

  console.log(`Calculando score para ${rows.length} prospectos...`)

  const scoreRows = rows.map((row) => {
    const { score, offer, breakdown } = scoreProspect(row)
    return {
      prospect_id: row.id,
      score_total: score,
      suggested_offer: offer,
      score_breakdown: breakdown,
    }
  })

  const { error: insertError } = await supabase.from('scores').insert(scoreRows)

  if (insertError) {
    console.error('Error guardando scores:', insertError.message)
    process.exit(1)
  }

  const byOffer = scoreRows.reduce((acc, r) => {
    const key = r.suggested_offer ?? 'sin_oferta_aun'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  console.log('\nResumen por oferta sugerida:')
  for (const [offer, count] of Object.entries(byOffer)) {
    console.log(`  ${offer}: ${count}`)
  }
}

run().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
