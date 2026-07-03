// Cloudflare Pages Function — consulta el estado más reciente de un workflow en GitHub Actions.

const ALLOWED_WORKFLOWS = {
  scan: 'scan.yml',
  audit: 'audit.yml',
  score: 'score.yml',
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const workflow = url.searchParams.get('workflow')
  const file = ALLOWED_WORKFLOWS[workflow]

  if (!file) {
    return json({ error: `Workflow desconocido: ${workflow}` }, 400)
  }

  const owner = env.GITHUB_OWNER || 'Grabsterolo'
  const repo = env.GITHUB_REPO || 'Prospecta'

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${file}/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Prospecta-Dashboard',
      },
    },
  )

  if (!response.ok) {
    const text = await response.text()
    return json({ error: `GitHub respondió ${response.status}: ${text}` }, response.status)
  }

  const data = await response.json()
  const run = data.workflow_runs?.[0]

  if (!run) {
    return json({ status: 'nunca_corrido' })
  }

  return json({
    status: run.status, // queued | in_progress | completed
    conclusion: run.conclusion, // success | failure | null
    created_at: run.created_at,
    updated_at: run.updated_at,
    html_url: run.html_url,
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
