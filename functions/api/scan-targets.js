// Cloudflare Pages Function — gestiona scan_targets (ciudades a escanear).

export async function onRequestGet(context) {
  const { env } = context
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/scan_targets?select=*&order=label.asc`,
    { headers: authHeaders(env) },
  )
  const data = await response.text()
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestPost(context) {
  const { request, env } = context
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Body inválido' }, 400)
  }

  if (body.action === 'toggle') {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/scan_targets?id=eq.${body.id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify({ active: body.active }),
    })
    const text = await response.text()
    return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  }

  if (body.action === 'create') {
    if (!body.city || !body.country || !body.osm_area) {
      return json({ error: 'Faltan campos requeridos (city, country, osm_area)' }, 400)
    }
    const label = body.label || `${body.city}, ${body.country}`
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/scan_targets`, {
      method: 'POST',
      headers: { ...authHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify({
        city: body.city,
        country: body.country,
        osm_area: body.osm_area,
        label,
      }),
    })
    const text = await response.text()
    return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  }

  return json({ error: 'Acción inválida' }, 400)
}

function authHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
