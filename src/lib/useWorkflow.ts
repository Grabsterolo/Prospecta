import { useEffect, useRef, useState } from 'react'
import { StepStatus } from '../components/StatusBadge'

export interface WorkflowState {
  status: StepStatus
  lastRunAt: string | null
  htmlUrl: string | null
}

const EMPTY_STATE: WorkflowState = { status: 'never', lastRunAt: null, htmlUrl: null }

async function fetchWorkflowStatus(workflow: string): Promise<WorkflowState> {
  const response = await fetch(`/api/workflow-status?workflow=${workflow}`)
  const data = await response.json()

  if (data.status === 'nunca_corrido' || !data.status) return EMPTY_STATE

  let status: StepStatus = 'idle'
  if (data.status !== 'completed') status = 'running'
  else if (data.conclusion === 'success') status = 'success'
  else status = 'error'

  return { status, lastRunAt: data.updated_at ?? data.created_at, htmlUrl: data.html_url }
}

export function useWorkflow(name: 'scan' | 'audit' | 'score') {
  const [state, setState] = useState<WorkflowState>(EMPTY_STATE)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchWorkflowStatus(name).then(setState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function poll(onDone?: () => void) {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const s = await fetchWorkflowStatus(name)
      setState(s)
      if (s.status !== 'running') {
        clearInterval(pollRef.current!)
        pollRef.current = null
        onDone?.()
      }
    }, 4000)
  }

  async function trigger(inputs: Record<string, string>, onDone?: () => void) {
    setState({ status: 'running', lastRunAt: new Date().toISOString(), htmlUrl: null })
    await fetch('/api/run-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: name, inputs }),
    })
    setTimeout(() => poll(onDone), 5000)
  }

  return { state, trigger }
}
