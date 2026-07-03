// Cloudflare Pages Function — gestiona target_categories con la service role key.
// Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages (NO con prefijo VITE_).

export async function onRequestGet(context) {
  const { env } = context
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/target_categories?select=*&order=priority.desc`,
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
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/target_categories?id=eq.${body.id}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(env), Prefer: 'return=representation' },
        body: JSON.stringify({ active: body.active }),
      },
    )
    const text = await response.text()
    return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  }

  if (body.action === 'create') {
    if (!body.category_key || !body.osm_tag || !body.label_es) {
      return json({ error: 'Faltan campos requeridos (category_key, osm_tag, label_es)' }, 400)
    }
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/target_categories`, {
      method: 'POST',
      headers: { ...authHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify({
        category_key: body.category_key,
        osm_tag: body.osm_tag,
        label_es: body.label_es,
        label_en: body.label_en || body.label_es,
        priority: body.priority ?? 0,
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
