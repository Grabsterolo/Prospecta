// Cloudflare Pages Function — dispara workflows de GitHub Actions desde el dashboard.
// Requiere las variables de entorno GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO en Cloudflare Pages.

const ALLOWED_WORKFLOWS = {
  scan: 'scan.yml',
  audit: 'audit.yml',
  score: 'score.yml',
}

export async function onRequestPost(context) {
  const { request, env } = context

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Body inválido' }, 400)
  }

  const { workflow, inputs } = body
  const file = ALLOWED_WORKFLOWS[workflow]

  if (!file) {
    return json({ error: `Workflow desconocido: ${workflow}` }, 400)
  }

  // GitHub exige que todos los inputs sean strings
  const stringInputs = Object.fromEntries(
    Object.entries(inputs ?? {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  )

  const owner = env.GITHUB_OWNER || 'Grabsterolo'
  const repo = env.GITHUB_REPO || 'Prospecta'

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${file}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Prospecta-Dashboard',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main', inputs: stringInputs }),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    return json({ error: `GitHub respondió ${response.status}: ${text}` }, response.status)
  }

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
